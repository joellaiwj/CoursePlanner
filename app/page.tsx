"use client";

import { useEffect, useRef, useState } from "react";
import { CANVAS_WRITING_GUIDANCE } from "../lib/obtl-guidance";

const workflow = [
  ["01", "Identify Goals", "Define what students are able to demonstrate through intended learning outcomes"],
  ["02", "Determine Evidence", "Determine how students will demonstrate achievement of learning outcomes through assessments"],
  ["03", "Plan Experiences", "Design learning activities that build toward the goal"],
  ["04", "Align & Refine", "Check alignment between outcomes, assessment and learning activities"],
];
const workflowSections = [
  [1, 2],
  [2, 3, 4],
  [2, 3, 4, 5, 6],
  [],
];
const initialSections = [
  ["Course Information", "Course code: CS4008\nCourse title: Artificial Intelligence Literacies"],
  ["Course Aims", "Develop the critical awareness and practical judgment needed to engage with AI thoughtfully and responsibly."],
  ["Course Intended Learning Outcomes", "LO1: Evaluate AI-generated outputs critically.\nLO2: Apply AI tools responsibly for different purposes.\nLO3: Collaborate effectively with people and AI systems.\nLO4–LO6: Demonstrate ethical judgment, reflective practice and transferable problem-solving."],
  ["Course Content", "AI foundations and literacies; metacognitive and feedback literacies; emotional and ethical dimensions; applied case analysis; responsible AI practice."],
  ["Assessment", "Team capstone project: 40%\nMidterm concept check: 25%\nProject milestones and individual reflection: 35%"],
  ["Learning and Teaching Approaches", "Inquiry-driven learning, collaborative knowledge building, project-based learning and AI 4Learn."],
  ["Planned Weekly Schedule", "Weeks 1–4: Foundations\nWeeks 5–7: Applied inquiry\nWeeks 8–12: Project studio\nWeek 13: Showcase and reflection"],
];
const initialAssessments = [
  { component: "Team capstone project", ilo: "LO1, LO2, LO3", programme: "Collaboration, Problem solving", weighting: "40", mode: "Team" },
  { component: "Midterm concept check", ilo: "LO1, LO2", programme: "Digital fluency", weighting: "25", mode: "Individual" },
  { component: "Project milestones and reflection", ilo: "LO2, LO3", programme: "Learning agility", weighting: "35", mode: "Individual" },
];
const initialApproaches = [
  { approach: "Inquiry-driven learning", support: "Engages students in authentic investigation and evidence-based meaning-making." },
  { approach: "Project-based learning", support: "Builds and demonstrates the intended outcomes through an authentic team challenge." },
];
const initialSchedule = [
  { week: "1", topic: "AI foundations", ilo: "LO1", activities: "Interactive seminar, diagnostic activity and guided inquiry" },
  { week: "2", topic: "Metacognitive literacies", ilo: "LO1, LO2", activities: "Case analysis, reflection protocol and peer discussion" },
];
const agents = [
  ["ID", "IDEL Aligner", "Checks inquiry-driven experiential learning alignment", "ready", "idel"],
  ["AD", "Assessment Designer", "Designs valid, fair and AI-resilient evidence", "ready", "assessment"],
  ["CC", "CCS+ Evaluator", "Maps six future-ready competencies", "ready", ""],
  ["PB", "Project-based Learning", "Sequences authentic project milestones", "ready", ""],
  ["KB", "Collaborative Knowledge Building", "Builds collaborative learning activities", "ready", ""],
  ["4L", "AI 4Learn", "Suggests purposeful learning activities using the 4Learn framework and SAMR", "ready", "ai4learn"],
];
const coursePlanners = [
  { plannerKey: "AB1201", code: "AB1201", title: "Financial Management", school: "Nanyang Business School", status: "Draft", updated: "Updated 5 days ago", progress: 48, accent: "gold" },
  { plannerKey: "CE2006", code: "CE2006", title: "Software Engineering", school: "School of Computer Science and Engineering", status: "In progress", updated: "Updated 1 week ago", progress: 65, accent: "blue" },
  { plannerKey: "CS4008", code: "CS4008", title: "Artificial Intelligence Literacies", school: "College of Computing and Data Science", status: "In progress", updated: "Updated just now", progress: 72, accent: "green" },
  { plannerKey: "HG2051", code: "HG2051", title: "Language and the Mind", school: "School of Humanities", status: "Ready for review", updated: "Updated 2 weeks ago", progress: 86, accent: "plum" },
  { plannerKey: "MH1810", code: "MH1810", title: "Mathematics I", school: "School of Physical and Mathematical Sciences", status: "Ready for review", updated: "Updated 2 days ago", progress: 91, accent: "navy" },
];

function savedAtLabel(value: string) {
  const elapsed = Date.now() - new Date(`${value.replace(" ", "T")}Z`).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 60_000) return "Updated just now";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `Updated ${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days} ${days === 1 ? "day" : "days"} ago`;
}

function modifiedAtLabel(value: string) {
  const parsed = new Date(`${value.replace(" ", "T")}Z`);
  if (!Number.isFinite(parsed.getTime())) return "Not yet saved";
  return parsed.toLocaleString("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type SpecialistProposal = {
  target: "courseInformation" | "courseAims" | "outcomes" | "topics" | "assessment" | "approaches" | "schedule";
  action: "add" | "revise";
  rowIndex?: number;
  rationale: string;
  item: Partial<{ courseCode: string; courseTitle: string; courseAims: string; outcome: string; component: string; ilo: string; programme: string; weighting: string; mode: string; approach: string; support: string; week: string; topic: string; activities: string }>;
};
type SubagentKey = "idel" | "assessment" | "ai4learn";
type SpecialistResult = {
  summary: string;
  subagentFindings: Array<{ agent: string; observation: string; recommendation: string }>;
  proposals: SpecialistProposal[];
  questions?: string[];
  cautions: string[];
  nextStep?: string;
  contributors?: string[];
};
type ChatMessage = { role: "user" | "assistant"; text: string; agent?: string; findings?: SpecialistResult["subagentFindings"] };
const STARTING_CHAT_MESSAGE: ChatMessage = { role: "assistant", agent: "Course Coherence", text: "Ask me to review or revise your course design, and I’ll coordinate the relevant specialist agents to address your request." };

function normaliseProposal(value: unknown): SpecialistProposal | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const rawTarget = String(source.target ?? "").toLowerCase().trim();
  const target = rawTarget === "courseinformation" || rawTarget === "course information" ? "courseInformation"
    : rawTarget === "courseaims" || rawTarget === "course aims" ? "courseAims"
      : rawTarget === "outcome" || rawTarget === "outcomes" || rawTarget === "course intended learning outcomes" ? "outcomes"
        : rawTarget === "topic" || rawTarget === "topics" || rawTarget === "course content" ? "topics"
          : rawTarget === "assessment" ? "assessment"
            : rawTarget === "approach" || rawTarget === "learning and teaching approaches" || rawTarget === "approaches" ? "approaches"
              : rawTarget === "weekly schedule" || rawTarget === "planned weekly schedule" || rawTarget === "schedule" ? "schedule" : null;
  if (!target || !source.item || (typeof source.item !== "object" && typeof source.item !== "string")) return null;
  const rawItem = typeof source.item === "string" ? { text: source.item } : source.item as Record<string, unknown>;
  const text = (key: string) => typeof rawItem[key] === "string" ? rawItem[key].trim() : typeof rawItem[key] === "number" ? String(rawItem[key]) : "";
  const item = target === "courseInformation"
    ? { courseCode: text("courseCode"), courseTitle: text("courseTitle") }
    : target === "courseAims"
      ? { courseAims: text("courseAims") || text("text") }
      : target === "outcomes"
        ? { outcome: text("outcome") || text("text") }
        : target === "topics"
          ? { topic: text("topic") || text("text") }
          : target === "assessment"
    ? { component: text("component"), ilo: text("ilo"), programme: text("programme"), weighting: text("weighting"), mode: text("mode") }
    : target === "approaches"
      ? { approach: text("approach"), support: text("support") }
      : { week: text("week"), topic: text("topic"), ilo: text("ilo"), activities: text("activities") };
  if (!Object.values(item).some(Boolean)) return null;
  const rowIndex = typeof source.rowIndex === "number" ? source.rowIndex : Number(source.rowIndex);
  return {
    target,
    action: source.action === "revise" && Number.isInteger(rowIndex) && rowIndex >= 0 ? "revise" : "add",
    rowIndex: Number.isInteger(rowIndex) && rowIndex >= 0 ? rowIndex : undefined,
    rationale: typeof source.rationale === "string" ? source.rationale.trim() : "Specialist recommendation",
    item,
  };
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<"dashboard" | "planner">("dashboard");
  const [search, setSearch] = useState("");
  const [plannerSummaries, setPlannerSummaries] = useState(coursePlanners);
  const [activePlannerKey, setActivePlannerKey] = useState("CS4008");
  const [courseFile, setCourseFile] = useState("CS4008 course outline.docx");
  const [courseCode, setCourseCode] = useState("CS4008");
  const [courseTitle, setCourseTitle] = useState("Artificial Intelligence Literacies");
  const [activeStep, setActiveStep] = useState(2);
  const [focusedSections, setFocusedSections] = useState<number[]>([]);
  const [sections, setSections] = useState(initialSections);
  const [outcomes, setOutcomes] = useState([
    "Evaluate AI-generated outputs critically.",
    "Apply AI tools responsibly for different purposes.",
    "Collaborate effectively with people and AI systems.",
  ]);
  const [topics, setTopics] = useState(["AI foundations", "Metacognitive literacies", "Feedback literacies", "Responsible AI practice"]);
  const [topicInput, setTopicInput] = useState("");
  const [assessments, setAssessments] = useState(initialAssessments);
  const [approaches, setApproaches] = useState(initialApproaches);
  const [schedule, setSchedule] = useState(initialSchedule);
  const [open, setOpen] = useState([0, 1, 2, 3]);
  const [locked, setLocked] = useState([0]);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [enabledSubagents, setEnabledSubagents] = useState<SubagentKey[]>(["idel", "assessment", "ai4learn"]);
  const [chat, setChat] = useState<ChatMessage[]>([STARTING_CHAT_MESSAGE]);
  const [specialistResult, setSpecialistResult] = useState<SpecialistResult | null>(null);
  const [specialistError, setSpecialistError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("idle");
  const [lastModified, setLastModified] = useState("");
  const [openCourseMenu, setOpenCourseMenu] = useState<string | null>(null);
  const [courseAction, setCourseAction] = useState<string | null>(null);
  const refreshPlannerSummaries = async () => {
    try {
      const response = await fetch("/api/planner-draft");
      const payload = await response.json() as { planners?: Array<{ plannerKey: string; courseCode: string; courseTitle: string; updatedAt: string }>; deletedPlannerKeys?: string[] };
      if (!response.ok || !Array.isArray(payload.planners)) return;
      const deleted = new Set(Array.isArray(payload.deletedPlannerKeys) ? payload.deletedPlannerKeys : []);
      const unused = new Map(payload.planners.map((planner) => [planner.plannerKey, planner]));
      const merged = coursePlanners.filter((planner) => !deleted.has(planner.plannerKey)).map((planner) => {
        let draft = unused.get(planner.plannerKey);
        if (!draft) draft = [...unused.values()].find((candidate) => candidate.courseTitle.trim().toLowerCase() === planner.title.trim().toLowerCase());
        if (!draft) return planner;
        unused.delete(draft.plannerKey);
        return { ...planner, plannerKey: draft.plannerKey, code: draft.courseCode, title: draft.courseTitle, updated: savedAtLabel(draft.updatedAt) };
      });
      for (const draft of unused.values()) merged.push({ plannerKey: draft.plannerKey, code: draft.courseCode, title: draft.courseTitle, school: "", status: "Draft", updated: savedAtLabel(draft.updatedAt), progress: 0, accent: "green" });
      setPlannerSummaries(merged.sort((a, b) => a.code.localeCompare(b.code)));
    } catch {
      // Keep the built-in dashboard available if saved summaries cannot be loaded.
    }
  };
  useEffect(() => { void refreshPlannerSummaries(); }, []);
  const cloneCourse = async (course: (typeof coursePlanners)[number]) => {
    setOpenCourseMenu(null);
    if (!window.confirm(`Clone ${course.code} · ${course.title}?\n\nThis will create a separate draft that you can edit independently.`)) return;
    setCourseAction(course.plannerKey);
    try {
      const usedKeys = new Set(plannerSummaries.map((planner) => planner.plannerKey.toUpperCase()));
      const baseKey = `${course.code}-COPY`;
      let plannerKey = baseKey;
      let copyNumber = 2;
      while (usedKeys.has(plannerKey.toUpperCase())) plannerKey = `${baseKey}-${copyNumber++}`;
      const courseTitle = `${course.title} (Copy)`;
      const sourceResponse = await fetch(`/api/planner-draft?courseCode=${encodeURIComponent(course.plannerKey)}`);
      const sourcePayload = await sourceResponse.json() as { draft?: Record<string, unknown> | null };
      const defaultDraft = {
        courseFile: "", courseCode: plannerKey, courseTitle, activeStep: 0,
        sections: initialSections, outcomes: ["Evaluate AI-generated outputs critically.", "Apply AI tools responsibly for different purposes.", "Collaborate effectively with people and AI systems."],
        topics: ["AI foundations", "Metacognitive literacies", "Feedback literacies", "Responsible AI practice"], assessments: initialAssessments,
        approaches: initialApproaches, schedule: initialSchedule, open: [1, 2], locked: [], enabledSubagents: ["idel", "assessment", "ai4learn"], chat: [STARTING_CHAT_MESSAGE], specialistResult: null,
      };
      const draft = { ...defaultDraft, ...(sourceResponse.ok && sourcePayload.draft ? sourcePayload.draft : {}), courseCode: plannerKey, courseTitle, chat: [STARTING_CHAT_MESSAGE], specialistResult: null };
      const response = await fetch("/api/planner-draft", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseCode: plannerKey, courseTitle, draft }) });
      if (!response.ok) throw new Error("Clone failed");
      await refreshPlannerSummaries();
    } catch {
      window.alert("The course could not be cloned. Please try again.");
    } finally {
      setCourseAction(null);
    }
  };
  const deleteCourse = async (course: (typeof coursePlanners)[number]) => {
    setOpenCourseMenu(null);
    if (!window.confirm(`Delete ${course.code} · ${course.title}?\n\nThis will permanently remove the course planner and its saved draft. This action cannot be undone.`)) return;
    setCourseAction(course.plannerKey);
    try {
      const response = await fetch(`/api/planner-draft?courseCode=${encodeURIComponent(course.plannerKey)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      await refreshPlannerSummaries();
    } catch {
      window.alert("The course could not be deleted. Please try again.");
    } finally {
      setCourseAction(null);
    }
  };
  const addCourseFile = (list: FileList | null) => {
    const file = list?.[0];
    if (file) setCourseFile(file.name);
  };
  const runCourseCoherence = async (request: string, displayRequest = request) => {
    if (!request || running) return;
    setRunning(true);
    setSpecialistError("");
    setChat((current) => [...current, { role: "user", text: displayRequest }]);
    try {
      const response = await fetch("/api/course-coherence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: request,
          enabledSpecialists: enabledSubagents,
          canvas: { courseCode, courseTitle, courseAims: sections[1][1], outcomes, topics, assessments, approaches, schedule, lockedSections: locked.map((index) => sections[index][0]) },
        }),
      });
      const payload = await response.json() as { result?: SpecialistResult; error?: string };
      if (!response.ok || !payload.result) throw new Error(payload.error || "Course Coherence could not complete this request.");
      const result = { ...payload.result, proposals: Array.isArray(payload.result.proposals) ? payload.result.proposals.map(normaliseProposal).filter((proposal): proposal is SpecialistProposal => proposal !== null) : [] };
      setSpecialistResult(result);
      const questions = payload.result.questions?.filter(Boolean) ?? [];
      const responseText = questions.length ? `${payload.result.summary}\n\nTo refine this, please tell me: ${questions.join(" ")}` : payload.result.summary;
      setChat((current) => [...current, { role: "assistant", agent: "Course Coherence", text: responseText, findings: result.subagentFindings }]);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Course Coherence could not complete this request.";
      setSpecialistError(text);
      setChat((current) => [...current, { role: "assistant", agent: "Course Coherence", text }]);
    } finally {
      setRunning(false);
    }
  };
  const send = async () => {
    const request = message.trim();
    if (!request || running) return;
    setMessage("");
    await runCourseCoherence(request);
  };
  const selectWorkflowStep = (index: number) => {
    const targets = workflowSections[index];
    setActiveStep(index);
    setFocusedSections(targets);
    if (targets.length) {
      setOpen(targets);
      window.setTimeout(() => document.querySelector(`[data-section-index="${targets[0]}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  };
  const runAlignmentReview = async () => {
    selectWorkflowStep(3);
    const request = `Perform a constructive-alignment review of this course design. Check specifically for: (1) intended learning outcomes without assessment evidence; (2) assessments testing outcomes that are not declared; (3) intended learning outcomes without corresponding learning activities in the planned weekly schedule; (4) course-content topics that are not represented in the planned weekly schedule; and (5) opportunities where IDEL, assessment design or AI 4Learn specialists could strengthen alignment. Do not evaluate whether assessment weightings total 100%, because the canvas handles that with its visual checker. Explain the alignment gaps clearly and propose changes only for relevant unlocked sections.`;
    await runCourseCoherence(request, "Run a constructive-alignment review of this course design.");
  };
  const toggleSubagent = (key: SubagentKey) => {
    if (running) return;
    setEnabledSubagents((current) => {
      if (!current.includes(key)) return [...current, key];
      if ((key === "idel" || key === "assessment") && current.filter((item) => item === "idel" || item === "assessment").length === 1) return current;
      return current.filter((item) => item !== key);
    });
    setSpecialistResult(null);
  };
  const applySpecialistProposals = () => {
    if (!specialistResult) return;
    let nextAssessments = [...assessments];
    let nextApproaches = [...approaches];
    let nextSchedule = [...schedule];
    let nextCourseCode = courseCode;
    let nextCourseTitle = courseTitle;
    let nextCourseAims = sections[1][1];
    let nextOutcomes = [...outcomes];
    let nextTopics = [...topics];
    let applied = 0;
    let protectedCount = 0;
    const openedSections: number[] = [];
    for (const proposal of specialistResult.proposals) {
      const item = proposal.item ?? {};
      const sectionIndex = proposal.target === "courseInformation" ? 0 : proposal.target === "courseAims" ? 1 : proposal.target === "outcomes" ? 2 : proposal.target === "topics" ? 3 : proposal.target === "assessment" ? 4 : proposal.target === "approaches" ? 5 : 6;
      if (locked.includes(sectionIndex)) {
        protectedCount += 1;
        continue;
      }
      if (proposal.target === "courseInformation") {
        if (item.courseCode) nextCourseCode = item.courseCode;
        if (item.courseTitle) nextCourseTitle = item.courseTitle;
      } else if (proposal.target === "courseAims") {
        if (item.courseAims) nextCourseAims = item.courseAims;
      } else if (proposal.target === "outcomes") {
        const outcome = item.outcome ?? "";
        if (proposal.action === "revise" && Number.isInteger(proposal.rowIndex) && proposal.rowIndex! < nextOutcomes.length) nextOutcomes = nextOutcomes.map((row, index) => index === proposal.rowIndex && outcome ? outcome : row);
        else if (outcome) nextOutcomes.push(outcome);
      } else if (proposal.target === "topics") {
        const topic = item.topic ?? "";
        if (proposal.action === "revise" && Number.isInteger(proposal.rowIndex) && proposal.rowIndex! < nextTopics.length) nextTopics = nextTopics.map((row, index) => index === proposal.rowIndex && topic ? topic : row);
        else if (topic && !nextTopics.includes(topic)) nextTopics.push(topic);
      } else if (proposal.target === "assessment") {
        const next = { component: item.component ?? "", ilo: item.ilo ?? "", programme: item.programme ?? "", weighting: item.weighting ?? "", mode: item.mode ?? "" };
        if (proposal.action === "revise" && Number.isInteger(proposal.rowIndex) && proposal.rowIndex! < nextAssessments.length) nextAssessments = nextAssessments.map((row, index) => index === proposal.rowIndex ? { ...row, ...Object.fromEntries(Object.entries(next).filter(([, value]) => value !== "")) } : row);
        else nextAssessments.push(next);
      } else if (proposal.target === "approaches") {
        const next = { approach: item.approach ?? "", support: item.support ?? "" };
        if (proposal.action === "revise" && Number.isInteger(proposal.rowIndex) && proposal.rowIndex! < nextApproaches.length) nextApproaches = nextApproaches.map((row, index) => index === proposal.rowIndex ? { ...row, ...Object.fromEntries(Object.entries(next).filter(([, value]) => value !== "")) } : row);
        else nextApproaches.push(next);
      } else if (proposal.target === "schedule") {
        const next = { week: item.week ?? "", topic: item.topic ?? "", ilo: item.ilo ?? "", activities: item.activities ?? "" };
        if (proposal.action === "revise" && Number.isInteger(proposal.rowIndex) && proposal.rowIndex! < nextSchedule.length) nextSchedule = nextSchedule.map((row, index) => index === proposal.rowIndex ? { ...row, ...Object.fromEntries(Object.entries(next).filter(([, value]) => value !== "")) } : row);
        else nextSchedule.push(next);
      }
      applied += 1;
      openedSections.push(sectionIndex);
    }
    setCourseCode(nextCourseCode);
    setCourseTitle(nextCourseTitle);
    updateSection(1, nextCourseAims);
    setOutcomes(nextOutcomes);
    setTopics(nextTopics);
    setAssessments(nextAssessments);
    setApproaches(nextApproaches);
    setSchedule(nextSchedule);
    const protectedMessage = protectedCount ? ` ${protectedCount} ${protectedCount === 1 ? "change was" : "changes were"} not applied because the relevant canvas section is locked.` : "";
    setChat((current) => [...current, { role: "assistant", agent: "Course Coherence", text: applied ? `${applied} proposed ${applied === 1 ? "change has" : "changes have"} been applied to the canvas.${protectedMessage} Please review the updated sections and confirm any assessment weighting changes.` : `No changes were applied.${protectedMessage}` }]);
    setOpen((current) => Array.from(new Set([...current, ...openedSections])));
    setSpecialistResult(null);
  };
  const updateSection = (index: number, value: string) => setSections((current) => current.map((section, i) => i === index ? [section[0], value] : section));
  const addTopic = () => { const topic = topicInput.trim(); if (topic && !topics.includes(topic)) setTopics((current) => [...current, topic]); setTopicInput(""); };
  const updateAssessment = (row: number, field: keyof (typeof initialAssessments)[number], value: string) => setAssessments((current) => current.map((item, index) => index === row ? { ...item, [field]: value } : item));
  const addAssessment = () => setAssessments((current) => [...current, { component: "", ilo: "", programme: "", weighting: "", mode: "" }]);
  const assessmentTotal = assessments.reduce((sum, item) => sum + (Number(item.weighting) || 0), 0);
  const moveTopic = (index: number, direction: -1 | 1) => setTopics((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const updateApproach = (row: number, field: keyof (typeof initialApproaches)[number], value: string) => setApproaches((current) => current.map((item, index) => index === row ? { ...item, [field]: value } : item));
  const updateSchedule = (row: number, field: keyof (typeof initialSchedule)[number], value: string) => setSchedule((current) => current.map((item, index) => index === row ? { ...item, [field]: value } : item));
  const saveDraft = async () => {
    if (saveStatus === "saving") return;
    setSaveStatus("saving");
    try {
      const draft = { courseFile, courseCode, courseTitle, activeStep, sections, outcomes, topics, assessments, approaches, schedule, open, locked, enabledSubagents, chat, specialistResult };
      const response = await fetch("/api/planner-draft", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseCode: activePlannerKey, courseTitle, draft }) });
      const payload = await response.json() as { error?: string; updatedAt?: string | null };
      if (!response.ok) throw new Error(payload.error || "The draft could not be saved.");
      if (payload.updatedAt) setLastModified(payload.updatedAt);
      setPlannerSummaries((current) => current.map((planner) => planner.plannerKey === activePlannerKey ? { ...planner, code: courseCode, title: courseTitle, updated: "Updated just now" } : planner).sort((a, b) => a.code.localeCompare(b.code)));
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus((current) => current === "saved" ? "idle" : current), 2500);
    } catch {
      setSaveStatus("error");
    }
  };
  const openPlanner = async (course: (typeof coursePlanners)[number]) => {
    setSaveStatus("loading");
    setActivePlannerKey(course.plannerKey);
    try {
      const response = await fetch(`/api/planner-draft?courseCode=${encodeURIComponent(course.plannerKey)}`);
      const payload = await response.json() as { draft?: Record<string, unknown> | null; updatedAt?: string | null };
      const draft = response.ok ? payload.draft : null;
      setLastModified(response.ok && payload.updatedAt ? payload.updatedAt : "");
      setCourseCode(typeof draft?.courseCode === "string" ? draft.courseCode : course.code);
      setCourseTitle(typeof draft?.courseTitle === "string" ? draft.courseTitle : course.title);
      if (draft) {
        if (typeof draft.courseFile === "string") setCourseFile(draft.courseFile);
        if (typeof draft.activeStep === "number") setActiveStep(Math.min(Math.max(draft.activeStep, 0), workflow.length - 1));
        if (Array.isArray(draft.sections)) setSections(draft.sections as string[][]);
        if (Array.isArray(draft.outcomes)) setOutcomes(draft.outcomes as string[]);
        if (Array.isArray(draft.topics)) setTopics(draft.topics as string[]);
        if (Array.isArray(draft.assessments)) setAssessments(draft.assessments as typeof initialAssessments);
        if (Array.isArray(draft.approaches)) setApproaches(draft.approaches as typeof initialApproaches);
        if (Array.isArray(draft.schedule)) setSchedule(draft.schedule as typeof initialSchedule);
        if (Array.isArray(draft.open)) setOpen(draft.open as number[]);
        if (Array.isArray(draft.locked)) setLocked(draft.locked as number[]);
        if (Array.isArray(draft.enabledSubagents)) setEnabledSubagents(draft.enabledSubagents as SubagentKey[]);
        if (Array.isArray(draft.chat)) {
          const savedChat = draft.chat as ChatMessage[];
          setChat(savedChat.length && savedChat[0]?.role === "assistant" ? [STARTING_CHAT_MESSAGE, ...savedChat.slice(1)] : [STARTING_CHAT_MESSAGE, ...savedChat]);
        }
        if (draft.specialistResult && typeof draft.specialistResult === "object") setSpecialistResult(draft.specialistResult as SpecialistResult);
      }
    } finally {
      setSaveStatus("idle");
      setView("planner");
    }
  };
  const returnToDashboard = () => { if (window.confirm("Return to your course planners? Please save any changes you want to keep before leaving this canvas.")) { setView("dashboard"); void refreshPlannerSummaries(); } };

  const renderSectionEditor = (index: number, isLocked: boolean) => {
    if (index === 0) return <div className="field-grid"><label>Course Code<input value={courseCode} readOnly={isLocked} onChange={(event) => setCourseCode(event.target.value)} /></label><label>Course Title<input value={courseTitle} readOnly={isLocked} onChange={(event) => setCourseTitle(event.target.value)} /></label></div>;
    if (index === 2) return <div className="list-editor"><ol>{outcomes.map((outcome, outcomeIndex) => <li key={outcomeIndex}><span>LO{outcomeIndex + 1}</span><textarea value={outcome} readOnly={isLocked} aria-label={`Learning outcome ${outcomeIndex + 1}`} onChange={(event) => setOutcomes((current) => current.map((item, i) => i === outcomeIndex ? event.target.value : item))} />{!isLocked && <button onClick={() => setOutcomes((current) => current.filter((_, i) => i !== outcomeIndex))} aria-label={`Delete learning outcome ${outcomeIndex + 1}`}>×</button>}</li>)}</ol>{!isLocked && <button className="add-row" onClick={() => setOutcomes((current) => [...current, ""])}>＋ Add learning outcome</button>}</div>;
    if (index === 3) return <div className="topic-editor"><div className="topic-list ordered">{topics.map((topic, topicIndex) => <span key={topic}><b>{topicIndex + 1}</b>{topic}{!isLocked && <span className="topic-actions"><button disabled={topicIndex === 0} onClick={() => moveTopic(topicIndex, -1)} aria-label={`Move ${topic} earlier`}>↑</button><button disabled={topicIndex === topics.length - 1} onClick={() => moveTopic(topicIndex, 1)} aria-label={`Move ${topic} later`}>↓</button><button onClick={() => setTopics((current) => current.filter((item) => item !== topic))} aria-label={`Delete ${topic}`}>×</button></span>}</span>)}</div>{!isLocked && <div className="topic-input"><input value={topicInput} placeholder="Type a topic and press Enter" onChange={(event) => setTopicInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTopic(); } }} /><button onClick={addTopic}>Add topic</button></div>}</div>;
    if (index === 4) return <div className="assessment-editor"><div className="assessment-scroll"><table style={{ minWidth: "780px" }}><colgroup><col style={{ width: "24%" }} /><col style={{ width: "18%" }} /><col style={{ width: "28%" }} /><col style={{ width: "13%" }} /><col style={{ width: "13%" }} /><col style={{ width: "4%" }} /></colgroup><thead><tr><th>Component</th><th>Intended LO Tested</th><th>Related Programme LO and CCS+</th><th>Weighting (%)</th><th>Team / Individual</th><th aria-label="Actions" /></tr></thead><tbody>{assessments.map((row, rowIndex) => <tr key={rowIndex}>{(["component", "ilo", "programme", "weighting", "mode"] as const).map((field) => <td key={field}><input type={field === "weighting" ? "number" : "text"} min={field === "weighting" ? "0" : undefined} max={field === "weighting" ? "100" : undefined} value={row[field]} readOnly={isLocked} aria-label={`${field} for assessment ${rowIndex + 1}`} onChange={(event) => updateAssessment(rowIndex, field, event.target.value)} /></td>)}<td>{!isLocked && <button className="delete-row" onClick={() => setAssessments((current) => current.filter((_, i) => i !== rowIndex))} aria-label={`Delete assessment ${rowIndex + 1}`}>×</button>}</td></tr>)}</tbody></table></div><div className="table-footer">{!isLocked && <button className="add-row" onClick={addAssessment}>＋ Add assessment component</button>}<div className={assessmentTotal === 100 ? "weight-total valid" : "weight-total invalid"}><span>Total weighting</span><b>{assessmentTotal}%</b><em>{assessmentTotal === 100 ? "✓ Complete" : `${assessmentTotal < 100 ? 100 - assessmentTotal + "% remaining" : assessmentTotal - 100 + "% over"}`}</em></div></div></div>;
    if (index === 5) return <div className="data-table"><div className="assessment-scroll"><table><thead><tr><th>Approach</th><th>How does this approach support you in achieving the learning outcomes?</th><th aria-label="Actions" /></tr></thead><tbody>{approaches.map((row, rowIndex) => <tr key={rowIndex}><td><input value={row.approach} readOnly={isLocked} aria-label={`Approach ${rowIndex + 1}`} onChange={(event) => updateApproach(rowIndex, "approach", event.target.value)} /></td><td><textarea value={row.support} readOnly={isLocked} aria-label={`Support for approach ${rowIndex + 1}`} onChange={(event) => updateApproach(rowIndex, "support", event.target.value)} /></td><td>{!isLocked && <button className="delete-row" onClick={() => setApproaches((current) => current.filter((_, i) => i !== rowIndex))} aria-label={`Delete approach ${rowIndex + 1}`}>×</button>}</td></tr>)}</tbody></table></div>{!isLocked && <button className="add-row" onClick={() => setApproaches((current) => [...current, { approach: "", support: "" }])}>＋ Add approach</button>}</div>;
    if (index === 6) return <div className="data-table schedule-table"><div className="assessment-scroll"><table><thead><tr><th>Week Number</th><th>Topic</th><th>Intended LO</th><th>Learning Activities</th><th aria-label="Actions" /></tr></thead><tbody>{schedule.map((row, rowIndex) => <tr key={rowIndex}>{(["week", "topic", "ilo", "activities"] as const).map((field) => <td key={field}><input type={field === "week" ? "number" : "text"} min={field === "week" ? "1" : undefined} value={row[field]} readOnly={isLocked} aria-label={`${field} for week ${rowIndex + 1}`} onChange={(event) => updateSchedule(rowIndex, field, event.target.value)} /></td>)}<td>{!isLocked && <button className="delete-row" onClick={() => setSchedule((current) => current.filter((_, i) => i !== rowIndex))} aria-label={`Delete week ${rowIndex + 1}`}>×</button>}</td></tr>)}</tbody></table></div>{!isLocked && <button className="add-row" onClick={() => setSchedule((current) => [...current, { week: String(current.length + 1), topic: "", ilo: "", activities: "" }])}>＋ Add week</button>}</div>;
    return <textarea aria-label={`Edit ${sections[index][0]}`} value={sections[index][1]} readOnly={isLocked} onChange={(event) => updateSection(index, event.target.value)} />;
  };

  if (view === "dashboard") { const visibleCourses = plannerSummaries.filter((course) => `${course.code} ${course.title}`.toLowerCase().includes(search.toLowerCase())); return <main className="landing-shell" onClick={() => setOpenCourseMenu(null)}><header className="landing-topbar"><div className="brand"><span className="brand-mark">C</span><div><strong>Course Agentic Planner</strong><small>Outcomes-based course design workspace</small></div></div><div className="landing-user"><button>Help</button><span className="avatar">IN</span></div></header><section className="landing-hero"><p className="eyebrow">Your course design workspace</p><h1>Course planners</h1><p>Find, continue and review your outcomes-based course designs.</p><label className="course-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by course code or title"/></label></section><section className="planner-library"><div className="library-heading"><div><h2>Your planners</h2><p>{visibleCourses.length} {visibleCourses.length === 1 ? "course" : "courses"}</p></div><button className="new-planner">＋ New course planner</button></div><div className="course-grid clean">{visibleCourses.map((course) => <article className={`course-tile ${course.accent}${courseAction === course.plannerKey ? " busy" : ""}`} role="button" tabIndex={0} onClick={() => void openPlanner(course)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void openPlanner(course); } }} key={course.plannerKey}><div className="course-tile-top"><span>{course.code}</span><div className="course-menu" onClick={(event) => event.stopPropagation()}><button className="course-menu-trigger" aria-label={`Options for ${course.code}`} aria-haspopup="menu" aria-expanded={openCourseMenu === course.plannerKey} disabled={courseAction !== null} onClick={() => setOpenCourseMenu((current) => current === course.plannerKey ? null : course.plannerKey)}>•••</button>{openCourseMenu === course.plannerKey && <div className="course-menu-popover" role="menu"><button role="menuitem" onClick={() => void cloneCourse(course)}>Clone course</button><button className="delete" role="menuitem" onClick={() => void deleteCourse(course)}>Delete course</button></div>}</div></div><h3>{course.title}</h3><div className="course-tile-foot"><small>{courseAction === course.plannerKey ? "Updating…" : course.updated}</small></div></article>)}</div>{visibleCourses.length === 0 && <div className="empty-courses"><span>⌕</span><h3>No matching planners</h3><p>Try another course code or title.</p></div>}</section></main>; }

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand planner-brand"><button className="back-to-dashboard" onClick={returnToDashboard} aria-label="Back to course planners">←</button><span className="brand-mark">C</span><div><strong>Course Agentic Planner</strong><small>Outcomes-based course design workspace</small></div></div>
      <div className="title-control"><span>Planner</span><b>{courseCode} · {courseTitle}</b></div>
      <div className="top-actions"><div className="save-control"><span className="last-modified">Last modified: {lastModified ? modifiedAtLabel(lastModified) : "Not yet saved"}</span><button className={`ghost save-draft ${saveStatus}`} disabled={saveStatus === "saving"} onClick={() => void saveDraft()}>{saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "✓ Draft saved" : saveStatus === "error" ? "Try save again" : "Save draft"}</button></div><button className="primary">Export course plan ↗</button><span className="avatar">IN</span></div>
    </header>
    <div className="workspace">
      <aside className="left-rail">
        <section className="rail-heading"><p className="eyebrow">Course design</p><h2>Course Planning Workflow</h2></section>
        <nav className="steps" aria-label="Course planning steps">{workflow.map((step, index) => <button key={step[0]} className={activeStep === index ? "step active" : "step"} onClick={() => selectWorkflowStep(index)}><span>{step[0]}</span><div><b>{step[1]}</b><small>{step[2]}</small></div></button>)}</nav>
        {activeStep === 3 && <section className="alignment-action"><p><b>Constructive alignment review</b>Check relationships across outcomes, evidence, content and learning activities.</p><button disabled={running} onClick={() => void runAlignmentReview()}>{running ? "Reviewing alignment…" : "✦ Run alignment review"}</button></section>}
        <section className="sources"><div className="section-title"><div><p className="eyebrow">Start from a file</p><h3>Course upload</h3></div>{courseFile && <span>Ready</span>}</div>
          <p className="upload-copy">Upload the original course document to extract its details and populate the initial canvas.</p>
          <button className="dropzone" onClick={() => inputRef.current?.click()}><b>{courseFile ? "↻ Replace course file" : "＋ Upload course file"}</b><small>One PDF, PPTX or DOCX file</small></button>
          <input ref={inputRef} hidden type="file" accept=".pdf,.ppt,.pptx,.doc,.docx" onChange={(e) => addCourseFile(e.target.files)} />
          {courseFile && <div className="file-list"><div className="file populated"><span>{courseFile.endsWith("pdf") ? "PDF" : courseFile.includes("ppt") ? "PPT" : "DOC"}</span><div><p title={courseFile}>{courseFile}</p><small>Canvas populated</small></div><button onClick={() => setCourseFile("")} aria-label={`Remove ${courseFile}`}>×</button></div></div>}
          <p className="backend-note"><span>✓</span> Specialist-agent references are securely connected and managed in the background.</p>
        </section>
      </aside>
      <main className="middle-column">
      <section className="canvas">
        <div className="canvas-head"><div><p className="eyebrow">Live course blueprint</p><h1>OBTL Canvas</h1></div><div className="canvas-actions"><button onClick={() => setLocked(locked.length ? [] : sections.map((_, i) => i))}>⌁ {locked.length ? "Unlock all" : "Lock all"}</button><button onClick={() => setOpen(open.length === sections.length ? [] : sections.map((_, i) => i))}>{open.length === sections.length ? "Collapse" : "Expand"} all</button></div></div>
        <div className="canvas-sections">{sections.map((section, index) => { const isOpen=open.includes(index), isLocked=locked.includes(index), isFocused=focusedSections.includes(index); return <article data-section-index={index} className={`${isOpen ? "canvas-card expanded" : "canvas-card"}${isFocused ? " workflow-focused" : ""}`} key={section[0]}><div className="card-bar"><button className="card-title" onClick={() => setOpen(isOpen ? open.filter(i=>i!==index) : [...open,index])}><span>{String(index+1).padStart(2,"0")}</span><b>{section[0]}</b></button><div><button className={isLocked ? "lock locked" : "lock"} onClick={() => setLocked(isLocked ? locked.filter(i=>i!==index) : [...locked,index])}>{isLocked ? "● Locked" : "○ Editable"}</button><button onClick={() => setOpen(isOpen ? open.filter(i=>i!==index) : [...open,index])}>{isOpen ? "−" : "+"}</button></div></div>{isOpen && <div className={isLocked ? "card-content locked-content" : "card-content"}><p className="section-guidance"><span>Writing guidance</span>{CANVAS_WRITING_GUIDANCE[index]}</p>{renderSectionEditor(index, isLocked)}<small className="edit-status">{isLocked ? "Unlock this section to edit" : "Changes are reflected instantly in the canvas"}</small></div>}</article>})}</div>
      </section>
      <section className={specialistResult ? "synthesis-bar has-result" : "synthesis-bar"} aria-label="Latest synthesis"><div className="synthesis-label"><span>✦</span><div><p>Latest synthesis</p><em>{specialistResult ? "Ready for review" : "No pending changes"}</em></div></div><div className="synthesis-summary"><strong>{specialistResult ? "Course Coherence recommendations" : "Your canvas remains in your control"}</strong><p>{specialistResult?.summary ?? "Ask Course Coherence for a review. It will coordinate the relevant specialists before proposing any canvas changes."}</p></div><div className="tags">{(specialistResult?.contributors ?? ["Course Coherence"]).map((name) => <span key={name}>{name}</span>)}{specialistResult && <span>{specialistResult.proposals.length} proposed changes</span>}</div><div className="synthesis-actions">{specialistResult && <><button onClick={() => setSpecialistResult(null)}>Dismiss</button><button className="apply" onClick={applySpecialistProposals} disabled={!specialistResult.proposals.length}>Apply to canvas</button></>}</div></section>
      </main>
      <aside className="right-rail">
        <section className="orchestrator-head"><p className="eyebrow">AI orchestrator</p><h2>Design studio</h2>{running && <div className="run-state working"><i />Synthesizing recommendations…</div>}</section>
        <section className="agent-panel"><div className="agent-groups">{[["Course Coherence", agents.slice(0,3)], ["Instructional Approaches", agents.slice(3)]].map(([group, members]) => <section className="agent-group" key={group as string}><h4>{group as string}</h4><div className="agent-list compact">{(members as string[][]).map((agent) => { const key = agent[4] === "idel" || agent[4] === "assessment" || agent[4] === "ai4learn" ? agent[4] as SubagentKey : null; const available = key !== null; const enabled = key ? enabledSubagents.includes(key) : false; return <button type="button" className={`agent ${enabled ? "selected" : ""}`} data-description={available ? `${agent[2]}. Click to turn ${enabled ? "off" : "on"}.` : `${agent[2]}. Coming later.`} aria-label={`${agent[1]}: ${agent[2]}. ${available ? enabled ? "On" : "Off" : "Coming later"}.`} aria-pressed={available ? enabled : undefined} disabled={!available || running} onClick={() => key && toggleSubagent(key)} key={agent[1]}><b>{agent[1]}</b></button>; })}</div></section>)}</div></section>
        <div className="chat-heading"><h3>Chat</h3></div>
        <section className="chat-panel" aria-live="polite">{chat.map((item, index) => <article className={`chat-message ${item.role}`} key={index}><small>{item.role === "assistant" ? item.agent ?? "Course Coherence" : "You"}</small><p>{item.text}</p>{item.findings && item.findings.length > 0 && <details><summary>View specialist perspectives</summary><div>{item.findings.map((finding, findingIndex) => <section key={findingIndex}><b>{finding.agent}</b><p>{finding.observation}</p><em>{finding.recommendation}</em></section>)}</div></details>}</article>)}{running && <article className="chat-message assistant thinking"><small>Course Coherence</small><p>Routing the request, consulting relevant specialists and checking constructive alignment…</p></article>}</section>
        <section className="composer"><textarea value={message} disabled={running} onChange={(e) => setMessage(e.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Ask Course Coherence to review, revise or align the course design…"/><div><button className="attach" aria-label="Attach context">＋</button><span>{specialistError ? "Try again" : `${enabledSubagents.includes("idel") ? "IDEL" : ""}${enabledSubagents.includes("idel") && enabledSubagents.includes("assessment") ? " + " : ""}${enabledSubagents.includes("assessment") ? "Assessment" : ""}${enabledSubagents.includes("ai4learn") ? " · AI 4Learn" : ""} on`}</span><button className="send" disabled={running || !message.trim()} onClick={() => void send()} aria-label="Send message">↑</button></div></section>
        <p className="ai-disclaimer">AI can make mistakes. Review and verify content.</p>
      </aside>
    </div>
  </main>;
}
