import { NextResponse } from "next/server";
import { OBTL_WRITING_STANDARD } from "../../../lib/obtl-guidance";

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
  "Inquiry First Analyst: identify whether authentic inquiry precedes direct instruction and where questions, evidence and iteration can be strengthened.",
  "Student Agency Analyst: identify meaningful student choices, ownership, reflection and decision-making.",
  "Collaboration Analyst: identify purposeful interdependence, dialogue, peer knowledge-building and individual accountability.",
  "Impact Analyst: identify opportunities for learning to produce broadly defined value beyond task completion, without prescribing a single type of impact.",
  "Scaffolding Designer: propose a developmental path from supported participation (Level 1), through guided independence (Level 2), toward sustained independent application (Level 3). Higher-level courses should normally be supported toward Level 3.",
  "Recommendation Validator: check constructive alignment, feasibility, internal consistency and whether every recommendation is framed as advisory rather than authoritative.",
];

const responseShape = {
  summary: "A concise advisory synthesis, never a score or verdict.",
  subagentFindings: [{ agent: "Specialist role", observation: "Evidence from the canvas", recommendation: "Suggested improvement" }],
  proposals: [
    {
      target: "assessment | approaches | schedule",
      action: "add",
      rationale: "Why this improves IDEL alignment",
      item: {
        component: "Assessment only", ilo: "Assessment only", programme: "Assessment only", weighting: "Assessment only; leave blank unless justified", mode: "Assessment only",
        approach: "Approach only", support: "Approach only",
        week: "Schedule only", topic: "Schedule only", activities: "Schedule only",
      },
    },
  ],
  cautions: ["Uncertainties or information the educator should verify"],
};

function cleanText(value: unknown, max = 10_000) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function sanitiseCanvas(value: unknown): CanvasPayload {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rows = <T extends Record<string, string>>(key: string, fields: string[]): T[] =>
    Array.isArray(source[key])
      ? source[key].slice(0, 100).map((entry) => {
          const row = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
          return Object.fromEntries(fields.map((field) => [field, cleanText(row[field], 2_000)])) as T;
        })
      : [];

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
    const body = await request.json() as { message?: unknown; canvas?: unknown };
    const message = cleanText(body.message, 4_000).trim();
    if (!message) return NextResponse.json({ error: "Please enter a request for the IDEL Aligner." }, { status: 400 });

    const apiKey = process.env.AWS_BEARER_TOKEN_BEDROCK;
    const region = process.env.AWS_REGION ?? "ap-southeast-2";
    const modelId = process.env.BEDROCK_MODEL_ID ?? "amazon.nova-lite-v1:0";
    if (!apiKey) return NextResponse.json({ error: "The IDEL Aligner has not been connected to Bedrock." }, { status: 503 });

    const canvas = sanitiseCanvas(body.canvas);
    const prompt = `You are the IDEL Aligner for an outcomes-based university course planner. IDEL means Inquiry-driven Experiential Learning.

Your purpose is formative alignment, not authoritative evaluation. Never issue a score, rating, grade, compliance finding, pass/fail decision, or claim that a course definitively attains an IDEL level. Use language such as "the canvas suggests", "consider", and "could strengthen". Do not attribute the framework to any person or organisation.

Treat Inquiry First as a consistent principle across all levels. Treat impact broadly. Treat Levels 1–3 as developmental scaffolding, not a scoring scale: Level 1 is supported participation, Level 2 guided independence, and Level 3 sustained independent application. Higher-level courses should normally be scaffolded toward Level 3.

Prioritise practical proposals for Assessment, Learning and Teaching Approaches, and Planned Weekly Schedule. Preserve the educator's intent. Do not silently rewrite Course Aims, Course Content, or Intended Learning Outcomes. Recommendations must remain subject to educator approval.

${OBTL_WRITING_STANDARD}

Work internally through these specialist perspectives:
${specialistRoles.map((role, index) => `${index + 1}. ${role}`).join("\n")}

Return strict JSON only, with no markdown or surrounding commentary, matching this shape:
${JSON.stringify(responseShape)}

For each proposal, use exactly one target. Include only fields relevant to that target. Keep the proposal set focused (normally 1–4 additions). Do not make assessment weightings exceed 100%; leave a new weighting blank when redistribution requires educator judgment. Findings must cite concrete canvas evidence or explicitly state when evidence is missing.

Educator request:
${message}

Current editable canvas:
${JSON.stringify(canvas)}`;

    const response = await fetch(`https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens: 2_400, temperature: 0.2, topP: 0.9 },
      }),
    });

    if (!response.ok) {
      const requestId = response.headers.get("x-amzn-requestid");
      return NextResponse.json({ error: "Bedrock could not complete the IDEL analysis.", requestId }, { status: 502 });
    }

    const bedrock = await response.json() as { output?: { message?: { content?: Array<{ text?: string }> } }; usage?: unknown };
    const text = bedrock.output?.message?.content?.map((part) => part.text ?? "").join("").trim();
    if (!text) return NextResponse.json({ error: "The IDEL Aligner returned an empty response." }, { status: 502 });

    const result = extractJson(text);
    return NextResponse.json({ result, usage: bedrock.usage });
  } catch (error) {
    console.error("IDEL Aligner error", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "The IDEL analysis could not be completed. Please try again." }, { status: 500 });
  }
}
