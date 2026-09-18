import type { Engineer, Task } from "./types";

export const SKILLS = [
  "React",
  "Node.js",
  "Python",
  "Kubernetes",
  "AWS",
  "Networking",
  "Database",
  "Security",
  "ML/AI",
  "Mobile",
  "DevOps",
  "QA",
] as const;

export const LOCATIONS = ["Bengaluru", "Chennai", "Coimbatore", "Hyderabad", "Pune", "Remote"];

export const TASK_TYPES = [
  "Incident Response",
  "Feature Deployment",
  "Bug Fix",
  "Infra Migration",
  "Security Patch",
  "Performance Tuning",
  "Customer Escalation",
  "Data Pipeline",
  "API Integration",
  "Monitoring Setup",
];

const NAME_POOL = [
  "Arun Mehta", "Priya Sharma", "Karthik Iyer", "Divya Rao", "Sanjay Gupta",
  "Meera Nair", "Rahul Verma", "Ananya Pillai", "Vikram Singh", "Lakshmi Menon",
  "Rohan Kapoor", "Sneha Reddy", "Aditya Kumar", "Nisha Joshi", "Farhan Ali",
  "Kavya Krishnan", "Manish Chawla", "Pooja Desai", "Siddharth Rao", "Ritu Malhotra",
  "Aakash Bansal", "Swathi Suresh", "Naveen Bhat", "Tanya Kapoor", "Gaurav Saxena",
  "Isha Agarwal", "Deepak Nambiar", "Shreya Pandey", "Vivek Menon", "Radhika Shah",
  "Amitabh Ghosh", "Neha Bhatia", "Suresh Kumar", "Anjali Varma", "Kunal Oberoi",
  "Preeti Sinha", "Yash Thakur", "Simran Kaur", "Abhinav Dutta", "Vidya Balan",
  "Ravi Shankar", "Pallavi Chandra", "Nikhil Bose", "Aarti Kulkarni", "Mohit Arora",
  "Sunita Pillai", "Harish Babu", "Geetha Subramaniam",
];

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function buildEngineer(i: number, overrides: Partial<Engineer> = {}): Engineer {
  const name = NAME_POOL[i];
  const skillA = SKILLS[i % SKILLS.length];
  const skillB = SKILLS[(i * 3 + 2) % SKILLS.length];
  const skillC = SKILLS[(i * 5 + 4) % SKILLS.length];
  const skills = Array.from(new Set([skillA, skillB, skillC]));
  const workload = clamp(30 + ((i * 17) % 65), 15, 96);
  const slaSuccess = clamp(99 - ((i * 7) % 22), 74, 99);
  const avgCompletionHrs = +(1.2 + ((i * 3) % 9) * 0.5).toFixed(1);
  const availability: Engineer["availability"] =
    i % 11 === 0 ? "Unavailable" : workload > 80 ? "Busy" : "Available";

  return {
    id: `ENG-${String(i + 1).padStart(3, "0")}`,
    name,
    role: i % 6 === 0 ? "Senior Engineer" : i % 6 === 1 ? "Lead Engineer" : "Engineer",
    location: LOCATIONS[i % LOCATIONS.length],
    skills,
    workload,
    availability,
    slaSuccess,
    avgCompletionHrs,
    ...overrides,
  };
}

// Hand-tuned lead cast so the demo narrative (Arun -> Priya) is deterministic & believable.
export const ENGINEERS: Engineer[] = [
  buildEngineer(0, {
    name: "Arun Mehta",
    role: "Senior Engineer",
    skills: ["React", "Node.js", "AWS"],
    workload: 74,
    slaSuccess: 91,
    avgCompletionHrs: 2.4,
    availability: "Busy",
  }),
  buildEngineer(1, {
    name: "Priya Sharma",
    role: "Senior Engineer",
    skills: ["React", "Node.js", "AWS", "Security"],
    workload: 41,
    slaSuccess: 96,
    avgCompletionHrs: 1.9,
    availability: "Available",
  }),
  buildEngineer(2, {
    name: "Karthik Iyer",
    role: "Lead Engineer",
    skills: ["Kubernetes", "DevOps", "AWS"],
    workload: 55,
    slaSuccess: 94,
    avgCompletionHrs: 2.1,
    availability: "Available",
  }),
  buildEngineer(3, {
    name: "Divya Rao",
    role: "Engineer",
    skills: ["Python", "ML/AI", "Database"],
    workload: 38,
    slaSuccess: 93,
    avgCompletionHrs: 2.6,
    availability: "Available",
  }),
  buildEngineer(4, {
    name: "Sanjay Gupta",
    role: "Engineer",
    skills: ["Networking", "Security", "DevOps"],
    workload: 82,
    slaSuccess: 88,
    avgCompletionHrs: 3.1,
    availability: "Busy",
  }),
  buildEngineer(5, {
    name: "Meera Nair",
    role: "Engineer",
    skills: ["React", "Mobile", "QA"],
    workload: 29,
    slaSuccess: 97,
    avgCompletionHrs: 1.6,
    availability: "Available",
  }),
  ...Array.from({ length: 42 }, (_, k) => buildEngineer(k + 6)),
];

export interface TaskSeed {
  id: string;
  type: string;
  priority: Task["priority"];
  requiredSkills: string[];
  location: string;
  complexity: Task["complexity"];
  slaMinutesLeft: number;
  slaTotalMinutes: number;
  assignedTo: string; // engineer name, resolved to id
  status?: Task["status"];
}

const TASK_SEEDS: TaskSeed[] = [
  { id: "INC-104", type: "Incident Response", priority: "Critical", requiredSkills: ["React", "AWS"], location: "Bengaluru", complexity: "High", slaMinutesLeft: 38, slaTotalMinutes: 120, assignedTo: "Arun Mehta" },
  { id: "INC-098", type: "Customer Escalation", priority: "Critical", requiredSkills: ["Node.js", "Database"], location: "Chennai", complexity: "High", slaMinutesLeft: 22, slaTotalMinutes: 90, assignedTo: "Arun Mehta" },
  { id: "TSK-221", type: "Feature Deployment", priority: "High", requiredSkills: ["React", "Node.js"], location: "Remote", complexity: "Medium", slaMinutesLeft: 190, slaTotalMinutes: 240, assignedTo: "Priya Sharma" },
  { id: "TSK-233", type: "Infra Migration", priority: "High", requiredSkills: ["Kubernetes", "AWS"], location: "Pune", complexity: "High", slaMinutesLeft: 260, slaTotalMinutes: 480, assignedTo: "Karthik Iyer" },
  { id: "TSK-244", type: "Data Pipeline", priority: "Medium", requiredSkills: ["Python", "ML/AI"], location: "Hyderabad", complexity: "Medium", slaMinutesLeft: 340, slaTotalMinutes: 480, assignedTo: "Divya Rao" },
  { id: "SEC-057", type: "Security Patch", priority: "High", requiredSkills: ["Security", "Networking"], location: "Coimbatore", complexity: "Medium", slaMinutesLeft: 75, slaTotalMinutes: 180, assignedTo: "Sanjay Gupta" },
  { id: "BUG-311", type: "Bug Fix", priority: "Medium", requiredSkills: ["React", "QA"], location: "Remote", complexity: "Low", slaMinutesLeft: 410, slaTotalMinutes: 480, assignedTo: "Meera Nair" },
  { id: "API-128", type: "API Integration", priority: "Medium", requiredSkills: ["Node.js", "AWS"], location: "Bengaluru", complexity: "Medium", slaMinutesLeft: 55, slaTotalMinutes: 240, assignedTo: "Arun Mehta" },
  { id: "MON-076", type: "Monitoring Setup", priority: "Low", requiredSkills: ["DevOps", "Kubernetes"], location: "Pune", complexity: "Low", slaMinutesLeft: 420, slaTotalMinutes: 480, assignedTo: "Karthik Iyer" },
  { id: "PERF-042", type: "Performance Tuning", priority: "High", requiredSkills: ["Database", "Python"], location: "Hyderabad", complexity: "Medium", slaMinutesLeft: 150, slaTotalMinutes: 240, assignedTo: "Divya Rao" },
];

function resolveEngineerId(name: string): string {
  const eng = ENGINEERS.find((e) => e.name === name);
  return eng ? eng.id : ENGINEERS[0].id;
}

function scoreCurrentAssignment(task: Pick<Task, "requiredSkills">, engineer: Engineer): number {
  const matched = task.requiredSkills.filter((s) => engineer.skills.includes(s)).length;
  const skillMatch = (matched / task.requiredSkills.length) * 100;
  return Math.round(clamp(skillMatch * 0.6 + (100 - engineer.workload) * 0.25 + engineer.slaSuccess * 0.15, 40, 99));
}

function buildTaskFromSeed(seed: TaskSeed): Task {
  const engineerId = resolveEngineerId(seed.assignedTo);
  const engineer = ENGINEERS.find((e) => e.id === engineerId)!;
  return {
    id: seed.id,
    type: seed.type,
    priority: seed.priority,
    requiredSkills: seed.requiredSkills,
    location: seed.location,
    complexity: seed.complexity,
    slaMinutesLeft: seed.slaMinutesLeft,
    slaTotalMinutes: seed.slaTotalMinutes,
    status: seed.status ?? (seed.slaMinutesLeft < seed.slaTotalMinutes * 0.25 ? "At Risk" : "In Progress"),
    assignedTo: engineerId,
    suitabilityScore: scoreCurrentAssignment(seed, engineer),
  };
}

function generatedTask(i: number): Task {
  const type = TASK_TYPES[i % TASK_TYPES.length];
  const priorities: Task["priority"][] = ["Low", "Medium", "Medium", "High", "Critical"];
  const priority = priorities[(i * 3) % priorities.length];
  const skillA = SKILLS[(i * 2) % SKILLS.length];
  const skillB = SKILLS[(i * 5 + 1) % SKILLS.length];
  const requiredSkills = Array.from(new Set([skillA, skillB]));
  const total = 480 - (i % 4) * 60;
  const left = clamp(total - ((i * 53) % total), 12, total);
  const engineer = ENGINEERS[(i * 7 + 8) % ENGINEERS.length];
  const complexity: Task["complexity"] = i % 3 === 0 ? "High" : i % 3 === 1 ? "Medium" : "Low";

  const seed: TaskSeed = {
    id: `TSK-${String(300 + i)}`,
    type,
    priority,
    requiredSkills,
    location: LOCATIONS[(i * 2) % LOCATIONS.length],
    complexity,
    slaMinutesLeft: left,
    slaTotalMinutes: total,
    assignedTo: engineer.name,
  };
  return buildTaskFromSeed(seed);
}

export const TASKS: Task[] = [
  ...TASK_SEEDS.map(buildTaskFromSeed),
  ...Array.from({ length: 62 }, (_, i) => generatedTask(i)),
];

export const TOTAL_ENGINEERS = ENGINEERS.length;
