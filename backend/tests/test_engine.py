from app.db.seed import seed_database, _clamp


def test_clamp():
    assert _clamp(5, 0, 10) == 5
    assert _clamp(-5, 0, 10) == 0
    assert _clamp(15, 0, 10) == 10
    assert _clamp(0, 0, 100) == 0
    assert _clamp(100, 0, 100) == 100


def test_seed_creates_employees(db):
    seed_database(db)
    from app.models.models import Employee
    count = db.query(Employee).filter(Employee.active == True).count()
    assert count == 10


def test_seed_creates_tasks(db):
    from app.models.models import Task
    count = db.query(Task).count()
    assert count >= 20


def test_seed_creates_skills(db):
    from app.models.models import Skill
    count = db.query(Skill).count()
    assert count == 12


def test_seed_creates_historical_assignments(db):
    from app.models.models import HistoricalAssignment
    count = db.query(HistoricalAssignment).count()
    assert count >= 1000


def test_seed_idempotent(db):
    from app.models.models import Employee
    count_before = db.query(Employee).count()
    seed_database(db)
    count_after = db.query(Employee).count()
    assert count_before == count_after


def test_employee_skills_populated(db):
    from app.models.models import EmployeeSkill
    count = db.query(EmployeeSkill).count()
    assert count > 0


def test_task_required_skills_populated(db):
    from app.models.models import TaskRequiredSkill
    count = db.query(TaskRequiredSkill).count()
    assert count > 0
