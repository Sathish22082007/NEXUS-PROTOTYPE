import uuid
import random
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.models import (
    Employee, Skill, EmployeeSkill, Task, TaskRequiredSkill,
    HistoricalAssignment, Allocation, Event, OptimizationRun,
    AvailabilityStatus, TaskPriority, TaskComplexity, TaskStatus,
    HistoricalOutcome, AllocationStatus, EventType,
)

RANDOM_SEED = 42
random.seed(RANDOM_SEED)

SKILLS = [
    "React", "Node.js", "Python", "Kubernetes", "AWS",
    "Networking", "Database", "Security", "ML/AI",
    "Mobile", "DevOps", "QA",
]

LOCATIONS = ["Bengaluru", "Chennai", "Coimbatore", "Hyderabad", "Pune", "Remote"]

TASK_TYPES = [
    "Incident Response", "Feature Deployment", "Bug Fix",
    "Infra Migration", "Security Patch", "Performance Tuning",
    "Customer Escalation", "Data Pipeline", "API Integration",
    "Monitoring Setup",
]

NAMES = [
    ("Arun Mehta", "Senior Engineer"), ("Priya Sharma", "Senior Engineer"),
    ("Karthik Iyer", "Lead Engineer"), ("Divya Rao", "Engineer"),
    ("Sanjay Gupta", "Engineer"), ("Meera Nair", "Engineer"),
    ("Rahul Verma", "Engineer"), ("Ananya Pillai", "Senior Engineer"),
    ("Vikram Singh", "Lead Engineer"), ("Lakshmi Menon", "Engineer"),
]

TASK_SEEDS = [
    {"id": "INC-104", "type": "Incident Response", "priority": "Critical", "skills": ["React", "AWS"], "location": "Bengaluru", "complexity": "High", "sla_hours": 2.0, "effort": 3.4, "assigned_to": 0},
    {"id": "INC-098", "type": "Customer Escalation", "priority": "Critical", "skills": ["Node.js", "Database"], "location": "Chennai", "complexity": "High", "sla_hours": 1.5, "effort": 3.4, "assigned_to": 0},
    {"id": "TSK-221", "type": "Feature Deployment", "priority": "High", "skills": ["React", "Node.js"], "location": "Remote", "complexity": "Medium", "sla_hours": 4.0, "effort": 2.2, "assigned_to": 1},
    {"id": "TSK-233", "type": "Infra Migration", "priority": "High", "skills": ["Kubernetes", "AWS"], "location": "Pune", "complexity": "High", "sla_hours": 8.0, "effort": 3.4, "assigned_to": 2},
    {"id": "TSK-244", "type": "Data Pipeline", "priority": "Medium", "skills": ["Python", "ML/AI"], "location": "Hyderabad", "complexity": "Medium", "sla_hours": 8.0, "effort": 2.2, "assigned_to": 3},
    {"id": "SEC-057", "type": "Security Patch", "priority": "High", "skills": ["Security", "Networking"], "location": "Coimbatore", "complexity": "Medium", "sla_hours": 3.0, "effort": 2.2, "assigned_to": 4},
    {"id": "BUG-311", "type": "Bug Fix", "priority": "Medium", "skills": ["React", "QA"], "location": "Remote", "complexity": "Low", "sla_hours": 8.0, "effort": 1.3, "assigned_to": 5},
    {"id": "API-128", "type": "API Integration", "priority": "Medium", "skills": ["Node.js", "AWS"], "location": "Bengaluru", "complexity": "Medium", "sla_hours": 4.0, "effort": 2.2, "assigned_to": 0},
    {"id": "MON-076", "type": "Monitoring Setup", "priority": "Low", "skills": ["DevOps", "Kubernetes"], "location": "Pune", "complexity": "Low", "sla_hours": 8.0, "effort": 1.3, "assigned_to": 2},
    {"id": "PERF-042", "type": "Performance Tuning", "priority": "High", "skills": ["Database", "Python"], "location": "Hyderabad", "complexity": "Medium", "sla_hours": 4.0, "effort": 2.2, "assigned_to": 3},
    {"id": "TSK-300", "type": "Feature Deployment", "priority": "Medium", "skills": ["React", "Mobile"], "location": "Bengaluru", "complexity": "Medium", "sla_hours": 8.0, "effort": 2.2, "assigned_to": 5},
    {"id": "TSK-301", "type": "Bug Fix", "priority": "Low", "skills": ["Python", "QA"], "location": "Chennai", "complexity": "Low", "sla_hours": 8.0, "effort": 1.3, "assigned_to": 6},
    {"id": "TSK-302", "type": "Incident Response", "priority": "High", "skills": ["DevOps", "AWS"], "location": "Remote", "complexity": "High", "sla_hours": 2.0, "effort": 3.4, "assigned_to": 8},
    {"id": "TSK-303", "type": "Data Pipeline", "priority": "Medium", "skills": ["Python", "Database"], "location": "Pune", "complexity": "Medium", "sla_hours": 6.0, "effort": 2.2, "assigned_to": 3},
    {"id": "TSK-304", "type": "Security Patch", "priority": "Critical", "skills": ["Security", "DevOps"], "location": "Hyderabad", "complexity": "High", "sla_hours": 1.0, "effort": 3.4, "assigned_to": 4},
    {"id": "TSK-305", "type": "API Integration", "priority": "Medium", "skills": ["Node.js", "React"], "location": "Chennai", "complexity": "Medium", "sla_hours": 4.0, "effort": 2.2, "assigned_to": 1},
    {"id": "TSK-306", "type": "Customer Escalation", "priority": "High", "skills": ["React", "Node.js"], "location": "Bengaluru", "complexity": "High", "sla_hours": 2.0, "effort": 3.4, "assigned_to": 0},
    {"id": "TSK-307", "type": "Monitoring Setup", "priority": "Low", "skills": ["Kubernetes", "DevOps"], "location": "Remote", "complexity": "Low", "sla_hours": 8.0, "effort": 1.3, "assigned_to": 8},
    {"id": "TSK-308", "type": "Performance Tuning", "priority": "Medium", "skills": ["Database", "AWS"], "location": "Pune", "complexity": "Medium", "sla_hours": 4.0, "effort": 2.2, "assigned_to": 7},
    {"id": "TSK-309", "type": "Infra Migration", "priority": "High", "skills": ["Kubernetes", "Networking"], "location": "Coimbatore", "complexity": "High", "sla_hours": 6.0, "effort": 3.4, "assigned_to": 2},
]


def _clamp(n, lo, hi):
    return max(lo, min(hi, n))


def seed_database(db: Session):
    existing = db.query(Employee).count()
    if existing > 0:
        return

    skill_map = {}
    for s_name in SKILLS:
        skill = Skill(name=s_name)
        db.add(skill)
        db.flush()
        skill_map[s_name] = skill.id

    employee_ids = []
    engineer_skills = [
        ["React", "Node.js", "AWS"],
        ["React", "Node.js", "AWS", "Security"],
        ["Kubernetes", "DevOps", "AWS"],
        ["Python", "ML/AI", "Database"],
        ["Networking", "Security", "DevOps"],
        ["React", "Mobile", "QA"],
        ["Node.js", "Database", "Python"],
        ["Kubernetes", "AWS", "DevOps"],
        ["Security", "ML/AI", "Python"],
        ["React", "Node.js", "QA"],
    ]
    workloads = [74, 41, 55, 38, 82, 29, 60, 48, 35, 65]
    sla_successes = [91, 96, 94, 93, 88, 97, 90, 92, 95, 89]
    availabilities = [
        AvailabilityStatus.BUSY, AvailabilityStatus.AVAILABLE,
        AvailabilityStatus.AVAILABLE, AvailabilityStatus.AVAILABLE,
        AvailabilityStatus.BUSY, AvailabilityStatus.AVAILABLE,
        AvailabilityStatus.AVAILABLE, AvailabilityStatus.AVAILABLE,
        AvailabilityStatus.AVAILABLE, AvailabilityStatus.BUSY,
    ]

    for i, (name, role) in enumerate(NAMES):
        emp = Employee(
            employee_code=f"ENG-{str(i+1).zfill(3)}",
            name=name,
            role=role,
            location=LOCATIONS[i % len(LOCATIONS)],
            availability_status=availabilities[i],
            current_workload=workloads[i],
            max_capacity=100.0,
            historical_sla_success=sla_successes[i],
            active=True,
        )
        db.add(emp)
        db.flush()
        employee_ids.append(emp.id)

        for s_name in engineer_skills[i]:
            es = EmployeeSkill(
                employee_id=emp.id,
                skill_id=skill_map[s_name],
                proficiency=random.randint(3, 5),
            )
            db.add(es)

    task_assignments = {}
    for seed in TASK_SEEDS:
        status = TaskStatus.IN_PROGRESS
        if seed["id"].startswith("INC") or seed["id"].startswith("SEC"):
            status = TaskStatus.IN_PROGRESS
        elif seed["id"].startswith("MON"):
            status = TaskStatus.ASSIGNED

        sla_minutes_left = int(seed["sla_hours"] * 60 * random.uniform(0.3, 0.9))

        task = Task(
            id=seed["id"],
            title=f"{seed['type']} - {seed['id']}",
            task_type=seed["type"],
            priority=TaskPriority(seed["priority"]),
            urgency={"Critical": 10, "High": 7, "Medium": 5, "Low": 2}[seed["priority"]],
            sla_hours=seed["sla_hours"],
            estimated_effort_hours=seed["effort"],
            location=seed["location"],
            status=status,
            required_people=1,
            complexity=TaskComplexity(seed["complexity"]),
        )
        db.add(task)
        db.flush()

        for s_name in seed["skills"]:
            trs = TaskRequiredSkill(
                task_id=task.id,
                skill_id=skill_map[s_name],
                minimum_proficiency=2,
            )
            db.add(trs)

        alloc = Allocation(
            task_id=task.id,
            employee_id=employee_ids[seed["assigned_to"]],
            prediction_score=round(random.uniform(0.75, 0.96), 2),
            assignment_score=round(random.uniform(70, 95), 1),
            status=AllocationStatus.ACTIVE,
        )
        db.add(alloc)
        task_assignments[task.id] = employee_ids[seed["assigned_to"]]

    _generate_synthetic_history(db, employee_ids, skill_map, TASK_TYPES, LOCATIONS)

    db.commit()
    print("Database seeded successfully.")


def _generate_synthetic_history(db, employee_ids, skill_map, task_types, locations):
    task_complexities = list(TaskComplexity)
    outcomes = [HistoricalOutcome.SUCCESS] * 7 + [HistoricalOutcome.PARTIAL] * 2 + [HistoricalOutcome.FAILED]

    for i in range(1500):
        emp_idx = random.randint(0, len(employee_ids) - 1)
        emp_id = employee_ids[emp_idx]
        task_type = random.choice(task_types)
        complexity = random.choice(task_complexities)
        sla_h = random.choice([1.0, 2.0, 3.0, 4.0, 6.0, 8.0])
        effort_h = {"Low": 1.3, "Medium": 2.2, "High": 3.4}[complexity.value]
        skill_match = round(random.uniform(0.4, 1.0), 2)
        workload_at = round(random.uniform(20, 95), 1)
        location_match = random.random() > 0.3
        sla_met = random.random() < (0.85 if skill_match > 0.7 else 0.5)
        actual_h = round(effort_h * random.uniform(0.7, 1.5), 1)
        if not sla_met:
            actual_h = round(sla_h * random.uniform(1.0, 1.4), 1)
        outcome = random.choice(outcomes)
        if sla_met and actual_h <= sla_h:
            outcome = HistoricalOutcome.SUCCESS
        elif not sla_met:
            outcome = HistoricalOutcome.FAILED

        ha = HistoricalAssignment(
            employee_id=emp_id,
            task_id=f"HIST-{10000 + i}",
            task_type=task_type,
            task_complexity=complexity,
            skill_match=skill_match,
            workload_at_assignment=workload_at,
            location_match=location_match,
            sla_hours=sla_h,
            estimated_effort=effort_h,
            actual_completion_hours=actual_h,
            sla_met=sla_met,
            historical_outcome=outcome,
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 180)),
        )
        db.add(ha)
