"use client";

import { useRef, useState } from "react";

const workflow = [
  ["01", "Identify Goals", "Define what students are able to demonstrate through intended learning outcomes"],
  ["02", "Determine Evidence", "Determine how students will demonstrate achievement of learning outcomes through assessments"],
  ["03", "Plan Experiences", "Design learning activities that build toward the goal"],
  ["04", "Align & Refine", "Check alignment between outcomes, assessment and learning activities"],
  ["05", "Review & Finalise", "Check alignment between outcomes, assessment and learning activities"],
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
  ["ID", "IDeL Aligner", "Checks inquiry-driven experiential learning alignment", "ready"],
  ["AD", "Assessment Designer", "Designs valid, fair and AI-resilient evidence", "working"],
  ["CC", "CCS+ Evaluator", "Maps six future-ready competencies", "ready"],
  ["PB", "Project-based Learning", "Sequences authentic project milestones", "working"],
  ["KB", "Collaborative Knowledge Building", "Builds collaborative learning activities", "ready"],
  ["4L", "AI 4Learn", "Identifies purposeful AI augmentation", "ready"],
];
const coursePlanners = [
  { code: "AB1201", title: "Financial Management", school: "Nanyang Business School", status: "Draft", updated: "Updated 5 days ago", progress: 48, accent: "gold" },
  { code: "CE2006", title: "Software Engineering", school: "School of Computer Science and Engineering", status: "In progress", updated: "Updated 1 week ago", progress: 65, accent: "blue" },
  { code: "CS4008", title: "Artificial Intelligence Literacies", school: "College of Computing and Data Science", status: "In progress", updated: "Updated just now", progress: 72, accent: "green" },
  { code: "HG2051", title: "Language and the Mind", school: "School of Humanities", status: "Ready for review", updated: "Updated 2 weeks ago", progress: 86, accent: "plum" },
  { code: "MH1810", title: "Mathematics I", school: "School of Physical and Mathematical Sciences", status: "Ready for review", updated: "Updated 2 days ago", progress: 91, accent: "navy" },
];

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<"dashboard" | "planner">("dashboard");
  const [search, setSearch] = useState("");
  const [courseFile, setCourseFile] = useState("CS4008 course outline.docx");
  const [courseCode, setCourseCode] = useState("CS4008");
  const [courseTitle, setCourseTitle] = useState("Artificial Intelligence Literacies");
  const [activeStep, setActiveStep] = useState(2);
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
  const addCourseFile = (list: FileList | null) => {
    const file = list?.[0];
    if (file) setCourseFile(file.name);
  };
  const send = () => { if (!message.trim()) return; setRunning(true); setMessage(""); window.setTimeout(() => setRunning(false), 1600); };
  const updateSection = (index: number, value: string) => setSections((current) => current.map((section, i) => i === index ? [section[0], value] : section));
  const addTopic = () => { const topic = topicInput.trim(); if (topic && !topics.includes(topic)) setTopics((current) => [...current, topic]); setTopicInput(""); };
  const updateAssessment = (row: number, field: keyof (typeof initialAssessments)[number], value: string) => setAssessments((current) => current.map((item, index) => index === row ? { ...item, [field]: value } : item));
  const addAssessment = () => setAssessments((current) => [...current, { component: "", ilo: "", programme: "", weighting: "", mode: "" }]);
  const assessmentTotal = assessments.reduce((sum, item) => sum + (Number(item.weighting) || 0), 0);
  const moveTopic = (index: number, direction: -1 | 1) => setTopics((current) => { const next = [...current]; const target = index + direction; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const updateApproach = (row: number, field: keyof (typeof initialApproaches)[number], value: string) => setApproaches((current) => current.map((item, index) => index === row ? { ...item, [field]: value } : item));
  const updateSchedule = (row: number, field: keyof (typeof initialSchedule)[number], value: string) => setSchedule((current) => current.map((item, index) => index === row ? { ...item, [field]: value } : item));
  const openPlanner = (course: (typeof coursePlanners)[number]) => { setCourseCode(course.code); setCourseTitle(course.title); setView("planner"); };
  const returnToDashboard = () => { if (window.confirm("Return to your course planners? Please save any changes you want to keep before leaving this canvas.")) setView("dashboard"); };

  const renderSectionEditor = (index: number, isLocked: boolean) => {
    if (index === 0) return <div className="field-grid"><label>Course Code<input value={courseCode} readOnly={isLocked} onChange={(event) => setCourseCode(event.target.value)} /></label><label>Course Title<input value={courseTitle} readOnly={isLocked} onChange={(event) => setCourseTitle(event.target.value)} /></label></div>;
    if (index === 2) return <div className="list-editor"><ol>{outcomes.map((outcome, outcomeIndex) => <li key={outcomeIndex}><span>LO{outcomeIndex + 1}</span><textarea value={outcome} readOnly={isLocked} aria-label={`Learning outcome ${outcomeIndex + 1}`} onChange={(event) => setOutcomes((current) => current.map((item, i) => i === outcomeIndex ? event.target.value : item))} />{!isLocked && <button onClick={() => setOutcomes((current) => current.filter((_, i) => i !== outcomeIndex))} aria-label={`Delete learning outcome ${outcomeIndex + 1}`}>×</button>}</li>)}</ol>{!isLocked && <button className="add-row" onClick={() => setOutcomes((current) => [...current, ""])}>＋ Add learning outcome</button>}</div>;
    if (index === 3) return <div className="topic-editor"><div className="topic-list ordered">{topics.map((topic, topicIndex) => <span key={topic}><b>{topicIndex + 1}</b>{topic}{!isLocked && <span className="topic-actions"><button disabled={topicIndex === 0} onClick={() => moveTopic(topicIndex, -1)} aria-label={`Move ${topic} earlier`}>↑</button><button disabled={topicIndex === topics.length - 1} onClick={() => moveTopic(topicIndex, 1)} aria-label={`Move ${topic} later`}>↓</button><button onClick={() => setTopics((current) => current.filter((item) => item !== topic))} aria-label={`Delete ${topic}`}>×</button></span>}</span>)}</div>{!isLocked && <div className="topic-input"><input value={topicInput} placeholder="Type a topic and press Enter" onChange={(event) => setTopicInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTopic(); } }} /><button onClick={addTopic}>Add topic</button></div>}</div>;
    if (index === 4) return <div className="assessment-editor"><div className="assessment-scroll"><table style={{ minWidth: "780px" }}><colgroup><col style={{ width: "24%" }} /><col style={{ width: "18%" }} /><col style={{ width: "28%" }} /><col style={{ width: "13%" }} /><col style={{ width: "13%" }} /><col style={{ width: "4%" }} /></colgroup><thead><tr><th>Component</th><th>Intended LO Tested</th><th>Related Programme LO and CCS+</th><th>Weighting (%)</th><th>Team / Individual</th><th aria-label="Actions" /></tr></thead><tbody>{assessments.map((row, rowIndex) => <tr key={rowIndex}>{(["component", "ilo", "programme", "weighting", "mode"] as const).map((field) => <td key={field}><input type={field === "weighting" ? "number" : "text"} min={field === "weighting" ? "0" : undefined} max={field === "weighting" ? "100" : undefined} value={row[field]} readOnly={isLocked} aria-label={`${field} for assessment ${rowIndex + 1}`} onChange={(event) => updateAssessment(rowIndex, field, event.target.value)} /></td>)}<td>{!isLocked && <button className="delete-row" onClick={() => setAssessments((current) => current.filter((_, i) => i !== rowIndex))} aria-label={`Delete assessment ${rowIndex + 1}`}>×</button>}</td></tr>)}</tbody></table></div><div className="table-footer">{!isLocked && <button className="add-row" onClick={addAssessment}>＋ Add assessment component</button>}<div className={assessmentTotal === 100 ? "weight-total valid" : "weight-total invalid"}><span>Total weighting</span><b>{assessmentTotal}%</b><em>{assessmentTotal === 100 ? "✓ Complete" : `${assessmentTotal < 100 ? 100 - assessmentTotal + "% remaining" : assessmentTotal - 100 + "% over"}`}</em></div></div></div>;
    if (index === 5) return <div className="data-table"><div className="assessment-scroll"><table><thead><tr><th>Approach</th><th>How does this approach support you in achieving the learning outcomes?</th><th aria-label="Actions" /></tr></thead><tbody>{approaches.map((row, rowIndex) => <tr key={rowIndex}><td><input value={row.approach} readOnly={isLocked} aria-label={`Approach ${rowIndex + 1}`} onChange={(event) => updateApproach(rowIndex, "approach", event.target.value)} /></td><td><textarea value={row.support} readOnly={isLocked} aria-label={`Support for approach ${rowIndex + 1}`} onChange={(event) => updateApproach(rowIndex, "support", event.target.value)} /></td><td>{!isLocked && <button className="delete-row" onClick={() => setApproaches((current) => current.filter((_, i) => i !== rowIndex))} aria-label={`Delete approach ${rowIndex + 1}`}>×</button>}</td></tr>)}</tbody></table></div>{!isLocked && <button className="add-row" onClick={() => setApproaches((current) => [...current, { approach: "", support: "" }])}>＋ Add approach</button>}</div>;
    if (index === 6) return <div className="data-table schedule-table"><div className="assessment-scroll"><table><thead><tr><th>Week Number</th><th>Topic</th><th>Intended LO</th><th>Learning Activities</th><th aria-label="Actions" /></tr></thead><tbody>{schedule.map((row, rowIndex) => <tr key={rowIndex}>{(["week", "topic", "ilo", "activities"] as const).map((field) => <td key={field}><input type={field === "week" ? "number" : "text"} min={field === "week" ? "1" : undefined} value={row[field]} readOnly={isLocked} aria-label={`${field} for week ${rowIndex + 1}`} onChange={(event) => updateSchedule(rowIndex, field, event.target.value)} /></td>)}<td>{!isLocked && <button className="delete-row" onClick={() => setSchedule((current) => current.filter((_, i) => i !== rowIndex))} aria-label={`Delete week ${rowIndex + 1}`}>×</button>}</td></tr>)}</tbody></table></div>{!isLocked && <button className="add-row" onClick={() => setSchedule((current) => [...current, { week: String(current.length + 1), topic: "", ilo: "", activities: "" }])}>＋ Add week</button>}</div>;
    return <textarea aria-label={`Edit ${sections[index][0]}`} value={sections[index][1]} readOnly={isLocked} onChange={(event) => updateSection(index, event.target.value)} />;
  };

  if (view === "dashboard") { const visibleCourses = coursePlanners.filter((course) => `${course.code} ${course.title}`.toLowerCase().includes(search.toLowerCase())); return <main className="landing-shell"><header className="landing-topbar"><div className="brand"><span className="brand-mark">C</span><div><strong>Course Agentic Planner</strong><small>Outcomes-based course design workspace</small></div></div><div className="landing-user"><button>Help</button><span className="avatar">IN</span></div></header><section className="landing-hero"><p className="eyebrow">Your course design workspace</p><h1>Course planners</h1><p>Find, continue and review your outcomes-based course designs.</p><label className="course-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by course code or title"/></label></section><section className="planner-library"><div className="library-heading"><div><h2>Your planners</h2><p>{visibleCourses.length} {visibleCourses.length === 1 ? "course" : "courses"}</p></div><button className="new-planner">＋ New course planner</button></div><div className="course-grid clean">{visibleCourses.map((course) => <button className={`course-tile ${course.accent}`} onClick={() => openPlanner(course)} key={course.code}><div className="course-tile-top"><span>{course.code}</span></div><h3>{course.title}</h3><div className="course-tile-foot"><small>{course.updated}</small></div></button>)}</div>{visibleCourses.length === 0 && <div className="empty-courses"><span>⌕</span><h3>No matching planners</h3><p>Try another course code or title.</p></div>}</section></main>; }

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand planner-brand"><button className="back-to-dashboard" onClick={returnToDashboard} aria-label="Back to course planners">←</button><span className="brand-mark">C</span><div><strong>Course Agentic Planner</strong><small>Outcomes-based course design workspace</small></div></div>
      <div className="title-control"><span>Planner</span><b>{courseCode} · {courseTitle}</b><button aria-label="Edit title">✎</button></div>
      <div className="top-actions"><button className="ghost">Save draft</button><button className="primary">Export course plan ↗</button><span className="avatar">IN</span></div>
    </header>
    <div className="workspace">
      <aside className="left-rail">
        <section className="rail-heading"><p className="eyebrow">Course design</p><h2>Course Planning Workflow</h2></section>
        <nav className="steps" aria-label="Course planning steps">{workflow.map((step, index) => <button key={step[0]} className={activeStep === index ? "step active" : index < activeStep ? "step done" : "step"} onClick={() => setActiveStep(index)}><span>{index < activeStep ? "✓" : step[0]}</span><div><b>{step[1]}</b><small>{step[2]}</small></div></button>)}</nav>
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
        <div className="canvas-sections">{sections.map((section, index) => { const isOpen=open.includes(index), isLocked=locked.includes(index); return <article className={isOpen ? "canvas-card expanded" : "canvas-card"} key={section[0]}><div className="card-bar"><button className="card-title" onClick={() => setOpen(isOpen ? open.filter(i=>i!==index) : [...open,index])}><span>{String(index+1).padStart(2,"0")}</span><b>{section[0]}</b></button><div><button className={isLocked ? "lock locked" : "lock"} onClick={() => setLocked(isLocked ? locked.filter(i=>i!==index) : [...locked,index])}>{isLocked ? "● Locked" : "○ Editable"}</button><button onClick={() => setOpen(isOpen ? open.filter(i=>i!==index) : [...open,index])}>{isOpen ? "−" : "+"}</button></div></div>{isOpen && <div className={isLocked ? "card-content locked-content" : "card-content"}>{renderSectionEditor(index, isLocked)}<small className="edit-status">{isLocked ? "Unlock this section to edit" : "Changes are reflected instantly in the canvas"}</small></div>}</article>})}</div>
      </section>
      <section className="synthesis-bar" aria-label="Latest synthesis"><div className="synthesis-label"><span>✦</span><div><p>Latest synthesis</p><em>Just now</em></div></div><div className="synthesis-summary"><strong>Strengthen evidence across milestones</strong><p>Add an individual decision log to make each student’s reasoning visible and improve assessment validity.</p></div><div className="tags"><span>Assessment Designer</span><span>IDeL Aligner</span></div><div className="synthesis-actions"><button>Dismiss</button><button className="apply">Apply to canvas</button></div></section>
      </main>
      <aside className="right-rail">
        <section className="orchestrator-head"><p className="eyebrow">AI orchestrator</p><h2>Design studio</h2><div className={running ? "run-state working" : "run-state"}><i />{running ? "Synthesizing recommendations…" : "6 specialists connected"}</div></section>
        <section className="agent-panel"><div className="panel-title"><h3>Specialist agents</h3><button>View trace</button></div><div className="agent-groups">{[["Course Coherence", agents.slice(0,3)], ["Instructional Approaches", agents.slice(3)]].map(([group, members]) => <section className="agent-group" key={group as string}><h4>{group as string}</h4><div className="agent-list compact">{(members as string[][]).map((agent) => <div className="agent" data-description={agent[2]} aria-label={`${agent[1]}: ${agent[2]}`} tabIndex={0} key={agent[1]}><b>{agent[1]}</b><i className={agent[3]} /></div>)}</div></section>)}</div></section>
        <section className="composer"><textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask the orchestrator to revise, check or generate…"/><div><button className="attach">＋</button><span>Canvas-aware</span><button className="send" onClick={send} aria-label="Send message">↑</button></div></section>
        <p className="ai-disclaimer">AI can make mistakes. Review and verify content.</p>
      </aside>
    </div>
  </main>;
}
