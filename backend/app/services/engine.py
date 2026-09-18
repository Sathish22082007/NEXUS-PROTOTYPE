import time
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.models import (
    Employee, Task, Allocation, Event, Skill, EmployeeSkill, TaskRequiredSkill,
    AvailabilityStatus, TaskStatus, TaskPriority, TaskComplexity,
    EventType, AllocationStatus, HistoricalOutcome,
)
from app.ml.predict import predict_sla_probability, get_model_metrics
from app.optimization.solver import (
    solve_global_allocation, CandidateInput, ObjectiveWeights, DEFAULT_WEIGHTS,
)
from app.explanation.explainer import generate_explanation, evidence_to_dict


def _skill_match_score(task_skills: list[str], emp_skills: list[str]) -> float:
    if not task_skills:
        return 0.0
    matched = len(set(task_skills) & set(emp_skills))
    return matched / len(task_skills)


def _score_candidate_single(task: Task, employee: Employee, emp_skill_names: list[str]) -> dict:
    task_skill_names = [trs.skill.name for trs in task.required_skills]
    skill_match = _skill_match_score(task_skill_names, emp_skill_names)
    location_match = task.location == employee.location
    ml_score = predict_sla_probability(
        skill_match=skill_match,
        workload=employee.current_workload,
        location_match=location_match,
        sla_hours=task.sla_hours,
        estimated_effort=task.estimated_effort_hours,
        complexity=task.complexity.value,
        task_type=task.task_type,
        employee_sla_success=employee.historical_sla_success,
    )
    return {
        "total": round(ml_score * 100, 1),
        "skill_match": round(skill_match * 100, 1),
        "workload": employee.current_workload,
        "available_now": employee.availability_status == AvailabilityStatus.AVAILABLE,
        "prediction_score": round(ml_score, 3),
    }


def _build_reasons(assignment: dict, employee: Employee) -> list[str]:
    reasons = []
    ml = assignment["ml_prediction"]
    if ml >= 0.7:
        reasons.append(f"Strong ML prediction ({ml:.0%} SLA success)")
    elif ml >= 0.5:
        reasons.append(f"Moderate ML prediction ({ml:.0%} SLA success)")
    else:
        reasons.append(f"Weak ML prediction ({ml:.0%} SLA success)")
    sm = assignment["skill_match"]
    if sm >= 0.8:
        reasons.append(f"Skill match {int(sm*100)}%")
    elif sm >= 0.5:
        reasons.append(f"Partial skill match {int(sm*100)}%")
    reasons.append(f"Workload {int(assignment['workload'])}%")
    reasons.append(f"SLA success {int(employee.historical_sla_success)}%")
    if assignment.get("location_match"):
        reasons.append("Location match")
    if assignment.get("is_current_assignment"):
        reasons.append("Stable assignment preserved")
    return reasons


def _capture_metrics(db: Session) -> dict:
    employees = db.query(Employee).filter(Employee.active == True).all()
    tasks = db.query(Task).all()

    overloaded = sum(1 for e in employees if e.current_workload > 80)
    utilization = round(sum(e.current_workload for e in employees) / len(employees), 1) if employees else 0.0

    sla_risk = 0
    for t in tasks:
        if t.status.value in ("At Risk", "Reallocating"):
            sla_risk += 1
        elif t.sla_hours > 0 and t.estimated_effort_hours > 0:
            ratio = t.sla_hours / max(t.estimated_effort_hours, 0.1)
            if ratio < 1.2:
                sla_risk += 1

    active_allocs = db.query(Allocation).filter(Allocation.status == AllocationStatus.ACTIVE).count()
    unassigned = db.query(Task).filter(Task.status == TaskStatus.UNASSIGNED).count()

    return {
        "sla_risk": sla_risk,
        "overloaded": overloaded,
        "utilization": utilization,
        "active_assignments": active_allocs,
        "unassigned_tasks": unassigned,
        "total_employees": len(employees),
        "total_tasks": len(tasks),
    }


def _build_candidate_inputs(
    db: Session,
    tasks: list[Task],
    exclude_employee_id: str | None = None,
    current_allocations: dict[str, str] | None = None,
) -> list[CandidateInput]:
    employees = (
        db.query(Employee)
        .filter(Employee.active == True, Employee.availability_status != AvailabilityStatus.UNAVAILABLE)
        .all()
    )
    if not employees:
        return []

    candidates = []
    for task in tasks:
        task_skill_names = [trs.skill.name for trs in task.required_skills]
        for emp in employees:
            if exclude_employee_id and str(emp.id) == exclude_employee_id:
                continue
            emp_skills = [es.skill.name for es in emp.skills]
            has_required = all(s in emp_skills for s in task_skill_names)
            if not has_required:
                continue
            sm = _skill_match_score(task_skill_names, emp_skills)
            loc_match = task.location == emp.location
            ml = predict_sla_probability(
                skill_match=sm,
                workload=emp.current_workload,
                location_match=loc_match,
                sla_hours=task.sla_hours,
                estimated_effort=task.estimated_effort_hours,
                complexity=task.complexity.value,
                task_type=task.task_type,
                employee_sla_success=emp.historical_sla_success,
            )
            priority_val = {"Critical": 10, "High": 7, "Medium": 4, "Low": 1}.get(task.priority.value, 4)
            is_current = (
                current_allocations is not None
                and current_allocations.get(task.id) == str(emp.id)
            )
            candidates.append(CandidateInput(
                employee_id=str(emp.id),
                employee_name=emp.name,
                task_id=task.id,
                ml_prediction=ml,
                skill_match=sm,
                workload=emp.current_workload,
                availability=emp.availability_status.value,
                location_match=loc_match,
                historical_sla_success=emp.historical_sla_success,
                urgency=priority_val,
                is_current_assignment=is_current,
            ))
    return candidates


def process_employee_unavailable(db: Session, employee_id: str) -> dict:
    start = time.time()

    employee = db.query(Employee).filter(Employee.id == uuid.UUID(employee_id)).first()
    if not employee:
        raise ValueError(f"Employee {employee_id} not found")

    metrics_before = _capture_metrics(db)

    affected_allocations = (
        db.query(Allocation)
        .filter(Allocation.employee_id == employee.id, Allocation.status == AllocationStatus.ACTIVE)
        .all()
    )
    affected_task_ids = [a.task_id for a in affected_allocations]

    if not affected_task_ids:
        employee.availability_status = AvailabilityStatus.UNAVAILABLE
        db.commit()
        metrics_after = _capture_metrics(db)
        return {
            "event": {"type": "employee-unavailable", "employee_id": employee_id},
            "affected_task_ids": [],
            "reallocations": [],
            "impact": _build_impact(metrics_before, metrics_after, 0),
            "decision_stats": {"candidates_evaluated": 0, "constraints_checked": 0, "sla_risks": metrics_before["sla_risk"], "decision_seconds": 0.0},
            "explanations": [],
        }

    employee.availability_status = AvailabilityStatus.UNAVAILABLE
    db.flush()

    affected_tasks = []
    for a in affected_allocations:
        task = db.query(Task).filter(Task.id == a.task_id).first()
        if task:
            affected_tasks.append(task)

    current_allocs = {}
    all_allocs = db.query(Allocation).filter(Allocation.status == AllocationStatus.ACTIVE).all()
    for a in all_allocs:
        if str(a.employee_id) != employee_id:
            current_allocs[a.task_id] = str(a.employee_id)

    candidate_inputs = _build_candidate_inputs(
        db, affected_tasks, exclude_employee_id=employee_id, current_allocations=current_allocs
    )

    result = solve_global_allocation(candidate_inputs, DEFAULT_WEIGHTS, max_time_seconds=5.0)

    reallocations = []
    explanations = []
    assignments_by_task = {a["task_id"]: a for a in result.assignments}

    for task in affected_tasks:
        old_alloc = db.query(Allocation).filter(
            Allocation.task_id == task.id, Allocation.employee_id == employee.id, Allocation.status == AllocationStatus.ACTIVE
        ).first()
        assignment = assignments_by_task.get(task.id)
        if assignment:
            new_emp = db.query(Employee).filter(Employee.id == uuid.UUID(assignment["employee_id"])).first()
            if old_alloc:
                old_alloc.status = AllocationStatus.REASSIGNED
            new_alloc = Allocation(
                task_id=task.id,
                employee_id=uuid.UUID(assignment["employee_id"]),
                prediction_score=assignment["ml_prediction"],
                assignment_score=round(assignment["ml_prediction"] * 100, 1),
                status=AllocationStatus.ACTIVE,
            )
            db.add(new_alloc)
            task.status = TaskStatus.ASSIGNED

            evidence = generate_explanation(
                employee_id=assignment["employee_id"],
                employee_name=assignment["employee_name"],
                task_id=task.id,
                ml_prediction=assignment["ml_prediction"],
                skill_match=assignment["skill_match"],
                workload=assignment["workload"],
                location_match=assignment.get("location_match", False),
                historical_sla_success=new_emp.historical_sla_success if new_emp else 90.0,
                sla_hours=task.sla_hours,
                estimated_effort=task.estimated_effort_hours,
                task_urgency=task.priority.value,
                task_complexity=task.complexity.value,
            )
            explanations.append(evidence_to_dict(evidence))

            reallocations.append({
                "task_id": task.id,
                "before_employee_id": employee_id,
                "after_employee_id": assignment["employee_id"],
                "after_employee_name": assignment["employee_name"],
                "reasons": evidence.reason_codes[:5],
                "prediction_score": assignment["ml_prediction"],
                "skill_match": round(assignment["skill_match"] * 100, 1),
                "workload": assignment["workload"],
                "available_now": True,
            })

    for a in result.assignments:
        emp = db.query(Employee).filter(Employee.id == uuid.UUID(a["employee_id"])).first()
        if emp:
            emp.current_workload = min(emp.current_workload + 9.0, 100.0)
            if emp.current_workload > 80:
                emp.availability_status = AvailabilityStatus.BUSY

    event = Event(
        event_type=EventType.EMPLOYEE_UNAVAILABLE,
        employee_id=employee.id,
        payload=f"{employee.name} marked unavailable — {len(affected_task_ids)} tasks impacted, {len(reallocations)} reassigned",
    )
    db.add(event)

    elapsed = round(time.time() - start, 2)
    db.flush()
    metrics_after = _capture_metrics(db)

    db.commit()

    return {
        "event": {"type": "employee-unavailable", "employee_id": employee_id, "timestamp": datetime.now(timezone.utc).isoformat()},
        "affected_task_ids": affected_task_ids,
        "reallocations": reallocations,
        "impact": _build_impact(metrics_before, metrics_after, len(reallocations)),
        "decision_stats": {
            "candidates_evaluated": result.candidates_evaluated,
            "constraints_checked": result.constraints_checked,
            "sla_risks": metrics_after["sla_risk"],
            "decision_seconds": elapsed,
        },
        "explanations": explanations,
    }


def process_new_task(db: Session) -> dict:
    start = time.time()

    metrics_before = _capture_metrics(db)

    scenarios = [
        {"type": "Incident Response", "skills": ["Security", "Networking"], "location": "Bengaluru", "complexity": "High", "sla": 1.5, "effort": 3.4},
        {"type": "Customer Escalation", "skills": ["React", "Node.js"], "location": "Chennai", "complexity": "High", "sla": 2.0, "effort": 3.4},
        {"type": "Infra Migration", "skills": ["Kubernetes", "AWS"], "location": "Pune", "complexity": "High", "sla": 3.0, "effort": 3.4},
    ]

    existing_count = db.query(Task).count()
    scenario = scenarios[existing_count % len(scenarios)]
    task_id = f"CRIT-{100 + existing_count}"

    new_task = Task(
        id=task_id,
        title=f"{scenario['type']} - {task_id}",
        task_type=scenario["type"],
        priority=TaskPriority.CRITICAL,
        urgency=10,
        sla_hours=scenario["sla"],
        estimated_effort_hours=scenario["effort"],
        location=scenario["location"],
        status=TaskStatus.UNASSIGNED,
        required_people=1,
        complexity=TaskComplexity(scenario["complexity"]),
    )
    db.add(new_task)
    db.flush()

    for s_name in scenario["skills"]:
        skill = db.query(Skill).filter(Skill.name == s_name).first()
        if skill:
            trs = TaskRequiredSkill(task_id=new_task.id, skill_id=skill.id, minimum_proficiency=2)
            db.add(trs)
    db.flush()

    current_allocs = {}
    all_allocs = db.query(Allocation).filter(Allocation.status == AllocationStatus.ACTIVE).all()
    for a in all_allocs:
        current_allocs[a.task_id] = str(a.employee_id)

    candidate_inputs = _build_candidate_inputs(db, [new_task], current_allocations=current_allocs)

    result = solve_global_allocation(candidate_inputs, DEFAULT_WEIGHTS, max_time_seconds=5.0)

    reallocation = None
    explanations = []
    if result.assignments:
        best = result.assignments[0]
        new_emp = db.query(Employee).filter(Employee.id == uuid.UUID(best["employee_id"])).first()
        alloc = Allocation(
            task_id=new_task.id,
            employee_id=uuid.UUID(best["employee_id"]),
            prediction_score=best["ml_prediction"],
            assignment_score=round(best["ml_prediction"] * 100, 1),
            status=AllocationStatus.ACTIVE,
        )
        db.add(alloc)
        new_task.status = TaskStatus.ASSIGNED
        if new_emp:
            new_emp.current_workload = min(new_emp.current_workload + 9.0, 100.0)
            if new_emp.current_workload > 80:
                new_emp.availability_status = AvailabilityStatus.BUSY

        evidence = generate_explanation(
            employee_id=best["employee_id"],
            employee_name=best["employee_name"],
            task_id=new_task.id,
            ml_prediction=best["ml_prediction"],
            skill_match=best["skill_match"],
            workload=best["workload"],
            location_match=best.get("location_match", False),
            historical_sla_success=new_emp.historical_sla_success if new_emp else 90.0,
            sla_hours=new_task.sla_hours,
            estimated_effort=new_task.estimated_effort_hours,
            task_urgency=new_task.priority.value,
            task_complexity=new_task.complexity.value,
        )
        explanations.append(evidence_to_dict(evidence))

        reallocation = {
            "task_id": new_task.id,
            "before_employee_id": None,
            "after_employee_id": best["employee_id"],
            "after_employee_name": best["employee_name"],
            "reasons": evidence.reason_codes[:5],
            "prediction_score": best["ml_prediction"],
            "skill_match": round(best["skill_match"] * 100, 1),
            "workload": best["workload"],
            "available_now": True,
        }

    event = Event(
        event_type=EventType.NEW_TASK,
        task_id=new_task.id,
        payload=f"New critical task {new_task.id}: {new_task.task_type} — assigned to {reallocation['after_employee_name'] if reallocation else 'none'}",
    )
    db.add(event)

    elapsed = round(time.time() - start, 2)
    db.flush()
    metrics_after = _capture_metrics(db)

    db.commit()

    return {
        "event": {"type": "new-task", "task_id": new_task.id, "timestamp": datetime.now(timezone.utc).isoformat()},
        "affected_task_ids": [new_task.id],
        "reallocations": [reallocation] if reallocation else [],
        "impact": _build_impact(metrics_before, metrics_after, 1 if reallocation else 0),
        "decision_stats": {
            "candidates_evaluated": result.candidates_evaluated,
            "constraints_checked": result.constraints_checked,
            "sla_risks": metrics_after["sla_risk"],
            "decision_seconds": elapsed,
        },
        "explanations": explanations,
    }


def _build_impact(before: dict, after: dict, assignments_changed: int) -> dict:
    return {
        "assignments_changed": assignments_changed,
        "sla_risk_before": before["sla_risk"],
        "sla_risk_after": after["sla_risk"],
        "overloaded_before": before["overloaded"],
        "overloaded_after": after["overloaded"],
        "utilization_before": before["utilization"],
        "utilization_after": after["utilization"],
        "active_assignments_before": before["active_assignments"],
        "active_assignments_after": after["active_assignments"],
        "unassigned_before": before["unassigned_tasks"],
        "unassigned_after": after["unassigned_tasks"],
    }


def _sla_risk_count(db: Session) -> int:
    return _capture_metrics(db)["sla_risk"]


def reset_to_seed(db: Session) -> dict:
    from app.db.seed import seed_database
    from app.database import engine, Base

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_database(db)

    return {"status": "ok", "message": "Database reset to initial seed state"}
