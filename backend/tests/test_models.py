from uuid import uuid4
from app.models.models import (
    Employee, Skill, Task, Allocation, Event,
    AvailabilityStatus, TaskPriority, TaskComplexity, TaskStatus,
    AllocationStatus,
)


def test_employee_creation(db):
    emp = Employee(
        employee_code="TEST-001",
        name="Test Engineer",
        role="Engineer",
        location="Bengaluru",
        availability_status=AvailabilityStatus.AVAILABLE,
        current_workload=50.0,
        max_capacity=100.0,
        historical_sla_success=92.0,
        active=True,
    )
    db.add(emp)
    db.flush()
    assert emp.id is not None
    assert emp.employee_code == "TEST-001"


def test_skill_creation(db):
    skill = Skill(name="TestSkill")
    db.add(skill)
    db.flush()
    assert skill.id is not None
    assert skill.name == "TestSkill"


def test_task_creation(db):
    task = Task(
        id="TEST-TSK-001",
        title="Test Task",
        task_type="Bug Fix",
        priority=TaskPriority.HIGH,
        urgency=7,
        sla_hours=4.0,
        estimated_effort_hours=2.2,
        location="Remote",
        status=TaskStatus.UNASSIGNED,
        required_people=1,
        complexity=TaskComplexity.MEDIUM,
    )
    db.add(task)
    db.flush()
    assert task.id == "TEST-TSK-001"
    assert task.priority == TaskPriority.HIGH
