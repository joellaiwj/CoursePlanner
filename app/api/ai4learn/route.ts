import { NextResponse } from "next/server";
import { OBTL_WRITING_STANDARD } from "../../../lib/obtl-guidance";
import { authenticatedUserId } from "../../../lib/request-auth";

export const runtime = "edge";

type CanvasPayload = {
  courseCode: string;
  courseTitle: string;
  courseAims: string;
  outcomes: string[];
  topics: string[];
  assessments: Array<{ component: string; ilo: string; programme: string; weighting: string; mode: string }>;
  approaches: Array<{ approach: string; support: string }>;
  schedule: Array<{ week: string; topic: string; ilo: string; activities: string }>;
};

const specialistRoles = [
  "Learning Need Analyst: begin with the learner need, intended outcome and evidence of learning; reject technology-first activity ideas.",
  "4Learn Mapper: identify which of Learning with, Learning about, Learning to use and Learning beyond are primary or supporting for the requested activity.",
  "SAMR Transformation Analyst: locate the current task and recommend the next purposeful Substitution, Augmentation, Modification or Redefinition move without inflating the level.",
  "Activity and Scaffolding Designer: create a feasible human-AI learning sequence with preparation, participation, feedback, reflection and transfer.",
  "Human Agency and Values Reviewer: preserve student and educator judgement, responsibility, creativity, empathy, collaboration and meaningful choice.",
  "Risk, Equity and Evidence Reviewer: check accessibility, alternatives, privacy, integrity, verification, workload and the evidence that will show whether learning improved.",
];

const responseShape = {
  summary: "Concise advisory synthesis in plain UK English.",
  fourLearnFocus: [{ dimension: "Learning with | Learning about | Learning to use | Learning beyond", role: "primary | supporting", rationale: "Why it matters here" }],
  samr: { current: "Substitution | Augmentation | Modification | Redefinition | unclear", target: "Substitution | Augmentation | Modification | Redefinition", rationale: "Educational reason for the next purposeful shift" },
  questions: ["Only essential information that would materially change the activity"],
  subagentFindings: [{ agent: "Specialist role", observation: "Concrete canvas evidence", recommendation: "Practical recommendation" }],
  proposals: [{
    target: "approaches | schedule",
    action: "add | revise",
    rowIndex: "Zero-based index for revise only",
    rationale: "How the activity supports the intended learning outcomes and 4Learn focus",
    item: { approach: "Approach only", support: "Approach only", week: "Schedule only", topic: "Schedule only", ilo: "Schedule only", activities: "Schedule only" },
  }],
  cautions: ["Assumptions, access, privacy, integrity, workload or human-review considerations"],
  nextStep: "Single most useful next action",
};

function cleanText(value: unknown, max = 10_000) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function sanitiseCanvas(value: unknown): CanvasPayload {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rows = <T extends Record<string, string>>(key: string, fields: string[]): T[] =>
    Array.isArray(source[key]) ? source[key].slice(0, 100).map((entry) => {
      const row = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
      return Object.fromEntries(fields.map((field) => [field, cleanText(row[field], 2_000)])) as T;
    }) : [];
  return {
    courseCode: cleanText(source.courseCode, 100),
    courseTitle: cleanText(source.courseTitle, 300),
    courseAims: cleanText(source.courseAims),
    outcomes: Array.isArray(source.outcomes) ? source.outcomes.slice(0, 50).map((item) => cleanText(item, 2_000)) : [],
    topics: Array.isArray(source.topics) ? source.topics.slice(0, 100).map((item) => cleanText(item, 500)) : [],
    assessments: rows("assessments", ["component", "ilo", "programme", "weighting", "mode"]),
    approaches: rows("approaches", ["approach", "support"]),
    schedule: rows("schedule", ["week", "topic", "ilo", "activities"]),
  };
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

export async function POST(request: Request) {
  try {
    if (!(await authenticatedUserId(request))) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    const body = await request.json() as { message?: unknown; canvas?: unknown };
    const message = cleanText(body.message, 4_000).trim();
    if (!message) return NextResponse.json({ error: "Please enter a request for AI 4Learn." }, { status: 400 });

    const apiKey = process.env.AWS_BEARER_TOKEN_BEDROCK;
    const region = process.env.AWS_REGION ?? "ap-southeast-2";
    const modelId = process.env.BEDROCK_MODEL_ID ?? "amazon.nova-lite-v1:0";
    if (!apiKey) return NextResponse.json({ error: "AI 4Learn has not been connected to Bedrock." }, { status: 503 });

    const canvas = sanitiseCanvas(body.canvas);
    const prompt = `You are the AI 4Learn specialist for an outcomes-based university Course Agentic Planner. Your purpose is to identify and suggest learning activities that educators can implement using the AI-Augmented, Data-Informed Learning Playbook. You are advisory, not an authoritative evaluator. Preserve the educator's intent and never edit the canvas directly.

CORE PROPOSITION
AI and learning analytics should extend human agency, not replace it. Success means deeper student learning, stronger faculty professional judgement and responsible use of evidence. AI must never be the sole basis for consequential judgements; human review and a route to challenge are required.

4LEARN FRAMEWORK
- Learning with: use AI as coach, guide, motivator, critic, collaborator or teachable peer for deeper inquiry, explanation, iteration, feedback literacy and metacognition.
- Learning about: build critical and disciplinary understanding of AI concepts, limitations, bias, uncertainty, provenance, appropriateness and responsible adoption.
- Learning to use: build practical, safe and ethical capability in tool selection, prompting, workflow design, verification, documentation and transfer.
- Learning beyond: strengthen judgement, creativity, empathy, collaboration, communication, responsibility, purpose and stakeholder awareness.

SAMR LENS
- Substitution: direct replacement with little functional change.
- Augmentation: functional improvement such as faster feedback, accessibility or richer insight.
- Modification: substantial redesign of the learning task, feedback cycle or sequence.
- Redefinition: a valuable authentic experience previously impractical or impossible at scale.
Judge SAMR by changes in the learning task, student agency and evidence of learning, not by technological sophistication. Recommend the next purposeful shift, not the highest level.

DESIGN RULES
1. Purpose before tool: begin with the learner need, outcome and evidence; suggest a tool category or role rather than inventing an approved product.
2. Human agency by design: make AI use, informed decisions and decisive human judgement explicit.
3. Learning, not task completion: require explanation, critique, iteration, verification and transfer rather than unexamined output generation.
4. Data as dialogue: use data for interpretation and action, not labels or rankings.
5. Assessment validity: preserve trustworthy evidence and explicit permitted-AI rules; do not redesign assessment unless the educator asks, and then flag it for Course Coherence and Assessment Designer review rather than proposing an assessment row.
6. Inclusion and accessibility: provide equitable access, an accessible non-AI alternative and support for varied confidence and language backgrounds.
7. Proportionate risk: avoid sensitive data; require stronger controls for higher-risk contexts.
8. Iterative improvement: pilot manageably and identify direct learning evidence, student/faculty experience, equity and risk evidence.

${OBTL_WRITING_STANDARD}

Work internally through these perspectives:
${specialistRoles.map((role, index) => `${index + 1}. ${role}`).join("\n")}

Return strict JSON only, with no markdown, matching this shape:
${JSON.stringify(responseShape)}

Use only approaches and schedule as proposal targets. Keep the set focused, normally 1–4. A revise proposal must retain the correct zero-based rowIndex and provide a complete replacement item. Learning activities should state what students do before, during and after AI use, the AI role, the human judgement point, evidence produced and a feasible alternative where relevant. Map only dimensions genuinely supported by the activity. Findings must cite canvas evidence or state what is missing. Recommendations remain subject to educator approval.

Educator request:
${message}

Current editable canvas:
${JSON.stringify(canvas)}`;

    const response = await fetch(`https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: [{ text: prompt }] }], inferenceConfig: { maxTokens: 2_600, temperature: 0.2, topP: 0.9 } }),
    });
    if (!response.ok) return NextResponse.json({ error: "Bedrock could not complete the AI 4Learn analysis." }, { status: 502 });
    const bedrock = await response.json() as { output?: { message?: { content?: Array<{ text?: string }> } }; usage?: unknown };
    const text = bedrock.output?.message?.content?.map((part) => part.text ?? "").join("").trim();
    if (!text) return NextResponse.json({ error: "AI 4Learn returned an empty response." }, { status: 502 });
    const result = extractJson(text) as Record<string, unknown>;
    if (Array.isArray(result.proposals)) result.proposals = result.proposals.filter((proposal) => proposal && typeof proposal === "object" && ["approaches", "schedule"].includes(String((proposal as Record<string, unknown>).target))).slice(0, 4);
    return NextResponse.json({ result, usage: bedrock.usage });
  } catch (error) {
    console.error("AI 4Learn error", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "The AI 4Learn analysis could not be completed. Please try again." }, { status: 500 });
  }
}
