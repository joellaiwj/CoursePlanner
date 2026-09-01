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
  "Context & Intent Analyst: classify the request as a redesign, new architecture, rubric task, implementation request or policy question; use existing canvas information and identify only material gaps.",
  "Constructive Alignment Analyst: examine whether the assessment evidence validly addresses the intended learning outcomes and programme/CCS+ mappings, and identify gaps or unnecessary duplication.",
  "Assessment Architecture Designer: design a coherent, integrated sequence of supervised and unsupervised components in which students critique, defend, apply or iterate on earlier work.",
  "AI Resilience & Transparency Adviser: clarify purposeful permitted AI use, process evidence and proportionate verification without recommending automated AI detection tools.",
  "Scalability & Feasibility Analyst: test marking workload, supervision, cohort-scale feasibility and student clarity; offer scalable alternatives where context is incomplete.",
  "Rubric & Evidence Designer: recommend observable evidence and criteria for critical decision-making, evaluative judgement, iterative refinement and process documentation.",
  "Assessment Artifact Drafter: only after conceptual approval, prepare student-facing briefs, rubrics, AI-use guidance and optional classroom implementation materials.",
  "Quality Assurance Validator: balance pedagogical validity, reliability, fairness and constructive alignment against lecturer workload, operational feasibility and student clarity.",
];

const responseShape = {
  summary: "Concise synthesis in plain UK English.",
  mode: "redesign | new-design | rubric | implementation | policy | clarification",
  questions: ["Only essential information genuinely missing from the canvas"],
  subagentFindings: [{ agent: "Specialist role", observation: "Concrete canvas evidence", recommendation: "Practical recommendation" }],
  proposals: [
    {
      target: "assessment | approaches | schedule",
      action: "add | revise",
      rowIndex: "Zero-based index for revise only",
      rationale: "Why the change improves the assessment design",
      item: {
        component: "Assessment only", ilo: "Assessment only", programme: "Assessment only", weighting: "Assessment only", mode: "Assessment only",
        approach: "Approach only", support: "Approach only",
        week: "Schedule only", topic: "Schedule only", activities: "Schedule only",
      },
    },
  ],
  cautions: ["Assumptions, workload implications or matters requiring educator confirmation"],
  nextStep: "The single most useful next action for the educator",
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
    if (!message) return NextResponse.json({ error: "Please enter a request for the Assessment Designer." }, { status: 400 });

    const apiKey = process.env.AWS_BEARER_TOKEN_BEDROCK;
    const region = process.env.AWS_REGION ?? "ap-southeast-2";
    const modelId = process.env.BEDROCK_MODEL_ID ?? "amazon.nova-lite-v1:0";
    if (!apiKey) return NextResponse.json({ error: "The Assessment Designer has not been connected to Bedrock." }, { status: 503 });

    const canvas = sanitiseCanvas(body.canvas);
    const prompt = `You are the Assessment Designer in an outcomes-based university Course Agentic Planner. You are a collegial, pragmatic assessment-design partner. Use plain, direct UK English. Guide reflection and propose feasible designs; do not behave like a checklist or force the educator through questions they have already answered.

FOUNDATIONAL DESIGN PRINCIPLES
- Validity: proposed evidence must assess the intended learning outcomes.
- Reliability: criteria and evidence should support consistent judgements across students and markers.
- Fairness: students need equitable opportunities to understand and demonstrate the required learning.
- Constructive alignment: assessment, teaching activities and intended outcomes must reinforce one another.
- Validate foundational competencies strategically. Recommend supervised evidence only where independent mastery is genuinely important, because supervision is resource-intensive.
- Grade process as well as product where appropriate. Prefer integrated multi-component architectures in which later components apply, critique, defend or iteratively improve earlier work.
- Build trust through transparent expectations, permitted-AI guidance, appropriate process evidence and educator oversight. Do not recommend automated AI detectors as evidence of misconduct.
- Always test recommendations for cohort size, marking workload and operational feasibility. When information is missing, state assumptions and offer scalable alternatives.

WORKFLOW
1. Silently classify the educator's semantic intent and choose the lightest useful response.
2. Read the entire canvas before asking anything. Ask only essential questions whose answers would materially change the design. Cohort size and course level are important for major redesigns, but do not block a provisional analysis when useful advice can still be given.
3. Work internally through the specialist perspectives below.
4. Present focused recommendations and proposed canvas changes for educator approval. Never change the canvas directly.
5. Preserve the educator's intent. Do not silently rewrite Course Aims, Course Content or Intended Learning Outcomes.

SPECIALIST PERSPECTIVES
${specialistRoles.map((role, index) => `${index + 1}. ${role}`).join("\n")}

DISCLOSURE-FORM BOUNDARY
The Academic Integrity and AI Disclosure Form is an optional classroom implementation resource, not an OBTL canvas section or assessment component. Do not add it to the canvas unless the educator explicitly chooses to make completion an assessed component. If the educator later requests an adapted form, Sections 1, 2 and 4 are protected source language and must not be rewritten or summarised; only header details and Section 3 collaboration phases may be adapted. In this planning response, simply identify the optional artefact and do not reproduce protected form text.

${OBTL_WRITING_STANDARD}

OUTPUT CONTRACT
Return strict JSON only with no markdown, matching this shape:
${JSON.stringify(responseShape)}

Use exactly one target for each proposal. A revise proposal must include the zero-based rowIndex of an existing row and a complete replacement item. An add proposal contains a complete new item. Keep proposals focused, usually 1–4. Ensure proposed assessment weightings do not cause the total to exceed 100%; leave weighting blank and explain redistribution in cautions when educator judgement is required. If essential information is missing, use questions and provisional findings rather than inventing facts. Findings must cite canvas evidence or say that evidence is missing.

Educator request:
${message}

Current editable canvas:
${JSON.stringify(canvas)}`;

    const response = await fetch(`https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: [{ text: prompt }] }], inferenceConfig: { maxTokens: 2_800, temperature: 0.2, topP: 0.9 } }),
    });

    if (!response.ok) {
      const requestId = response.headers.get("x-amzn-requestid");
      return NextResponse.json({ error: "Bedrock could not complete the assessment-design analysis.", requestId }, { status: 502 });
    }

    const bedrock = await response.json() as { output?: { message?: { content?: Array<{ text?: string }> } }; usage?: unknown };
    const text = bedrock.output?.message?.content?.map((part) => part.text ?? "").join("").trim();
    if (!text) return NextResponse.json({ error: "The Assessment Designer returned an empty response." }, { status: 502 });

    return NextResponse.json({ result: extractJson(text), usage: bedrock.usage });
  } catch (error) {
    console.error("Assessment Designer error", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "The assessment-design analysis could not be completed. Please try again." }, { status: 500 });
  }
}
