import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, Enum, Text, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class AvailabilityStatus(str, enum.Enum):
    AVAILABLE = "Available"
    BUSY = "Busy"
    UNAVAILABLE = "Unavailable"


class TaskPriority(str, enum.Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class TaskComplexity(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class TaskStatus(str, enum.Enum):
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    AT_RISK = "At Risk"
    REALLOCATING = "Reallocating"
    UNASSIGNED = "Unassigned"


class EventType(str, enum.Enum):
    EMPLOYEE_UNAVAILABLE = "employee-unavailable"
    NEW_TASK = "new-task"
    SLA_CHANGE = "sla-change"
    PRIORITY_CHANGE = "priority-change"
    WORKLOAD_CHANGE = "workload-change"
    OPTIMIZATION = "optimization"
    RESET = "reset"


class HistoricalOutcome(str, enum.Enum):
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"


class AllocationStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    REASSIGNED = "reassigned"
    CANCELLED = "cancelled"


class Employee(Base):
    __tablename__ = "employees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False)
    location = Column(String(50), nullable=False)
    availability_status = Column(
        Enum(AvailabilityStatus), nullable=False, default=AvailabilityStatus.AVAILABLE
    )
    current_workload = Column(Float, nullable=False, default=0.0)
    max_capacity = Column(Float, nullable=False, default=100.0)
    historical_sla_success = Column(Float, nullable=False, default=0.0)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    skills = relationship("EmployeeSkill", back_populates="employee", lazy="selectin")
    allocations = relationship("Allocation", back_populates="employee", lazy="selectin")

    __table_args__ = (
        Index("idx_employees_availability", "availability_status"),
        Index("idx_employees_active", "active"),
    )


class Skill(Base):
    __tablename__ = "skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)

    employee_skills = relationship("EmployeeSkill", back_populates="skill", lazy="selectin")
    task_skills = relationship("TaskRequiredSkill", back_populates="skill", lazy="selectin")


class EmployeeSkill(Base):
    __tablename__ = "employee_skills"

    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), primary_key=True)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id"), primary_key=True)
    proficiency = Column(Integer, nullable=False, default=3)

    employee = relationship("Employee", back_populates="skills")
    skill = relationship("Skill", back_populates="employee_skills")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(20), primary_key=True)
    title = Column(String(200), nullable=False)
    task_type = Column(String(50), nullable=False)
    priority = Column(Enum(TaskPriority), nullable=False, default=TaskPriority.MEDIUM)
    urgency = Column(Integer, nullable=False, default=5)
    sla_hours = Column(Float, nullable=False)
    estimated_effort_hours = Column(Float, nullable=False)
    location = Column(String(50), nullable=False)
    status = Column(Enum(TaskStatus), nullable=False, default=TaskStatus.UNASSIGNED)
    required_people = Column(Integer, nullable=False, default=1)
    complexity = Column(Enum(TaskComplexity), nullable=False, default=TaskComplexity.MEDIUM)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    required_skills = relationship("TaskRequiredSkill", back_populates="task", lazy="selectin")
    allocations = relationship("Allocation", back_populates="task", lazy="selectin")

    __table_args__ = (
        Index("idx_tasks_priority", "priority"),
        Index("idx_tasks_status", "status"),
    )


class TaskRequiredSkill(Base):
    __tablename__ = "task_required_skills"

    task_id = Column(String(20), ForeignKey("tasks.id"), primary_key=True)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id"), primary_key=True)
    minimum_proficiency = Column(Integer, nullable=False, default=1)

    task = relationship("Task", back_populates="required_skills")
    skill = relationship("Skill", back_populates="task_skills")


class HistoricalAssignment(Base):
    __tablename__ = "historical_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True)
    task_id = Column(String(20), nullable=False)
    task_type = Column(String(50), nullable=False)
    task_complexity = Column(Enum(TaskComplexity), nullable=False)
    skill_match = Column(Float, nullable=False)
    workload_at_assignment = Column(Float, nullable=False)
    location_match = Column(Boolean, nullable=False)
    sla_hours = Column(Float, nullable=False)
    estimated_effort = Column(Float, nullable=False)
    actual_completion_hours = Column(Float, nullable=False)
    sla_met = Column(Boolean, nullable=False)
    historical_outcome = Column(Enum(HistoricalOutcome), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    employee = relationship("Employee", lazy="selectin")

    __table_args__ = (
        Index("idx_historical_employee", "employee_id"),
        Index("idx_historical_sla_met", "sla_met"),
    )


class OptimizationRun(Base):
    __tablename__ = "optimization_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trigger_event = Column(String(50), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    objective_value = Column(Float, nullable=True)
    tasks_changed = Column(Integer, nullable=False, default=0)
    sla_risk_before = Column(Integer, nullable=False, default=0)
    sla_risk_after = Column(Integer, nullable=False, default=0)

    allocations = relationship("Allocation", back_populates="optimization_run", lazy="selectin")


class Allocation(Base):
    __tablename__ = "allocations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = Column(String(20), ForeignKey("tasks.id"), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=False, index=True)
    optimization_run_id = Column(UUID(as_uuid=True), ForeignKey("optimization_runs.id"), nullable=True)
    prediction_score = Column(Float, nullable=True)
    assignment_score = Column(Float, nullable=True)
    status = Column(Enum(AllocationStatus), nullable=False, default=AllocationStatus.ACTIVE)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    task = relationship("Task", back_populates="allocations")
    employee = relationship("Employee", back_populates="allocations")
    optimization_run = relationship("OptimizationRun", back_populates="allocations")


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(Enum(EventType), nullable=False, index=True)
    employee_id = Column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    task_id = Column(String(20), ForeignKey("tasks.id"), nullable=True)
    payload = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_events_type", "event_type"),
        Index("idx_events_created", "created_at"),
    )
