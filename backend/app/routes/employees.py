import json
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import (
    Employee, Task, Skill, EmployeeSkill, TaskRequiredSkill,
    Allocation, Event, OptimizationRun, HistoricalAssignment,
    AvailabilityStatus, TaskStatus, TaskPriority,
)
from app.schemas.api import (
    EmployeeOut, SkillOut, TaskOut, TaskRequiredSkillOut,
    DashboardStats, ActivityEventOut, OptimizationRunOut, EventResult,
)
from app.services.engine import process_employee_unavailable, process_new_task, reset_to_seed
from app.ml.predict import get_model_metrics

router = APIRouter(prefix="/api")


@router.get("/health")
def health_check():
    return {"status": "ok", "service": "nexus-backend"}


@router.get("/employees", response_model=list[EmployeeOut])
def get_employees(db: Session = Depends(get_db)):
    employees = db.query(Employee).filter(Employee.active == True).all()
    result = []
    for emp in employees:
        skills = [
            SkillOut(name=es.skill.name, proficiency=es.proficiency)
            for es in emp.skills
        ]
        result.append(EmployeeOut(
            id=emp.id,
            employee_code=emp.employee_code,
            name=emp.name,
            role=emp.role,
            location=emp.location,
            availability_status=emp.availability_status.value,
            current_workload=emp.current_workload,
            max_capacity=emp.max_capacity,
            historical_sla_success=emp.historical_sla_success,
            active=emp.active,
            skills=skills,
        ))
    return result


@router.get("/employees/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: UUID, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    skills = [
        SkillOut(name=es.skill.name, proficiency=es.proficiency)
        for es in emp.skills
    ]
    return EmployeeOut(
        id=emp.id,
        employee_code=emp.employee_code,
        name=emp.name,
        role=emp.role,
        location=emp.location,
        availability_status=emp.availability_status.value,
        current_workload=emp.current_workload,
        max_capacity=emp.max_capacity,
        historical_sla_success=emp.historical_sla_success,
        active=emp.active,
        skills=skills,
    )


@router.get("/tasks", response_model=list[TaskOut])
def get_tasks(db: Session = Depends(get_db)):
    tasks = db.query(Task).all()
    result = []
    for task in tasks:
        req_skills = [
            TaskRequiredSkillOut(name=trs.skill.name, minimum_proficiency=trs.minimum_proficiency)
            for trs in task.required_skills
        ]
        alloc = db.query(Allocation).filter(
            Allocation.task_id == task.id,
            Allocation.status == "active",
        ).first()
        assigned_to = None
        assigned_to_name = None
        suitability_score = None
        if alloc:
            emp = db.query(Employee).filter(Employee.id == alloc.employee_id).first()
            if emp:
                assigned_to = str(emp.id)
                assigned_to_name = emp.name
            suitability_score = alloc.assignment_score

        result.append(TaskOut(
            id=task.id,
            title=task.title,
            task_type=task.task_type,
            priority=task.priority.value,
            urgency=task.urgency,
            sla_hours=task.sla_hours,
            estimated_effort_hours=task.estimated_effort_hours,
            location=task.location,
            status=task.status.value,
            required_people=task.required_people,
            complexity=task.complexity.value,
            assigned_to=assigned_to,
            assigned_to_name=assigned_to_name,
            suitability_score=suitability_score,
            required_skills=req_skills,
        ))
    return result


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db)):
    emp_count = db.query(func.count(Employee.id)).filter(Employee.active == True).scalar()
    task_count = db.query(func.count(Task.id)).scalar()

    tasks = db.query(Task).all()
    sla_at_risk = 0
    for t in tasks:
        if t.sla_hours > 0:
            remaining_ratio = 1.0
            sla_at_risk += 1 if remaining_ratio < 0.25 else 0

    employees = db.query(Employee).filter(Employee.active == True).all()
    utilization = 0.0
    available = 0
    busy = 0
    unavailable = 0
    if employees:
        utilization = round(sum(e.current_workload for e in employees) / len(employees), 1)
        for e in employees:
            if e.availability_status == AvailabilityStatus.AVAILABLE:
                available += 1
            elif e.availability_status == AvailabilityStatus.BUSY:
                busy += 1
            else:
                unavailable += 1

    return DashboardStats(
        engineer_count=emp_count or 0,
        active_tasks=task_count or 0,
        sla_at_risk=sla_at_risk,
        utilization=utilization,
        available_employees=available,
        busy_employees=busy,
        unavailable_employees=unavailable,
    )


@router.get("/events", response_model=list[ActivityEventOut])
def get_events(db: Session = Depends(get_db)):
    events = db.query(Event).order_by(Event.created_at.desc()).limit(30).all()
    result = []
    for ev in events:
        tone = "info"
        if ev.event_type.value in ("employee-unavailable",):
            tone = "critical"
        elif ev.event_type.value in ("new-task",):
            tone = "warn"
        elif ev.event_type.value in ("optimization",):
            tone = "success"

        result.append(ActivityEventOut(
            id=str(ev.id),
            time=ev.created_at.strftime("%H:%M:%S"),
            message=ev.payload or ev.event_type.value,
            tone=tone,
        ))
    return result


@router.get("/optimization/history", response_model=list[OptimizationRunOut])
def get_optimization_history(db: Session = Depends(get_db)):
    runs = db.query(OptimizationRun).order_by(OptimizationRun.created_at.desc()).limit(20).all()
    return [
        OptimizationRunOut(
            id=r.id,
            trigger_event=r.trigger_event,
            created_at=r.created_at,
            objective_value=r.objective_value,
            tasks_changed=r.tasks_changed,
            sla_risk_before=r.sla_risk_before,
            sla_risk_after=r.sla_risk_after,
        )
        for r in runs
    ]


# ---- POST endpoints for Phase 2B ----

class EmployeeUnavailableRequest(BaseModel):
    employee_id: str


@router.post("/events/employee-unavailable")
def post_employee_unavailable(req: EmployeeUnavailableRequest, db: Session = Depends(get_db)):
    try:
        result = process_employee_unavailable(db, req.employee_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/events/new-task")
def post_new_task(db: Session = Depends(get_db)):
    return process_new_task(db)


@router.post("/reset")
def post_reset(db: Session = Depends(get_db)):
    return reset_to_seed(db)


@router.get("/model/metrics")
def get_ml_metrics():
    return get_model_metrics()
