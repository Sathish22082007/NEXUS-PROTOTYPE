from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "nexus-backend"


def test_get_employees():
    response = client.get("/api/employees")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    emp = data[0]
    assert "id" in emp
    assert "name" in emp
    assert "employee_code" in emp
    assert "skills" in emp


def test_get_tasks():
    response = client.get("/api/tasks")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    task = data[0]
    assert "id" in task
    assert "priority" in task
    assert "required_skills" in task


def test_get_dashboard():
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "engineer_count" in data
    assert "active_tasks" in data
    assert "sla_at_risk" in data
    assert "utilization" in data


def test_get_events():
    response = client.get("/api/events")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_optimization_history():
    response = client.get("/api/optimization/history")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_employee_not_found():
    from uuid import uuid4
    response = client.get(f"/api/employees/{uuid4()}")
    assert response.status_code == 404


def test_employee_unavailable():
    employees = client.get("/api/employees").json()
    emp = employees[0]
    response = client.post("/api/events/employee-unavailable", json={"employee_id": emp["id"]})
    assert response.status_code == 200
    data = response.json()
    assert "event" in data
    assert "affected_task_ids" in data
    assert "reallocations" in data
    assert "impact" in data
    assert "decision_stats" in data
    assert data["event"]["type"] == "employee-unavailable"


def test_employee_unavailable_not_found():
    from uuid import uuid4
    response = client.post("/api/events/employee-unavailable", json={"employee_id": str(uuid4())})
    assert response.status_code == 404


def test_new_task():
    response = client.post("/api/events/new-task")
    assert response.status_code == 200
    data = response.json()
    assert "event" in data
    assert "affected_task_ids" in data
    assert "reallocations" in data
    assert "impact" in data
    assert data["event"]["type"] == "new-task"
    assert len(data["affected_task_ids"]) > 0


def test_reset():
    response = client.post("/api/reset")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_full_workflow():
    client.post("/api/reset")
    employees = client.get("/api/employees").json()
    emp = employees[1]
    response = client.post("/api/events/employee-unavailable", json={"employee_id": emp["id"]})
    assert response.status_code == 200
    result = response.json()
    assert isinstance(result["reallocations"], list)
    response2 = client.post("/api/events/new-task")
    assert response2.status_code == 200
    result2 = response2.json()
    assert len(result2["affected_task_ids"]) > 0
