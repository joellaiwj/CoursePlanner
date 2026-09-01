import { NextResponse } from "next/server";
import { POST as runIdel } from "../idel-aligner/route";
import { POST as runAssessment } from "../assessment-designer/route";
import { POST as runInstructionalApproaches } from "../instructional-approaches/route";
import { OBTL_WRITING_STANDARD } from "../../../lib/obtl-guidance";
import { authenticatedUserId } from "../../../lib/request-auth";

export const runtime = "edge";

type SpecialistResult = {
  summary?: string;
  questions?: string[];
  subagentFindings?: Array<{ agent: string; observation: string; recommendation: string }>;
  proposals?: unknown[];
  cautions?: string[];
  nextStep?: string;
};

function cleanText(value: unknown, max = 4_000) {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

function routeRequest(message: string) {
  const lower = message.toLowerCase();
  const idel = /\b(idel|inquiry|experiential|agency|collaborat|impact|scaffold|student choice)\b/.test(lower);
  const assessment = /\b(assess|rubric|grading|marking|weight|evidence|exam|quiz|assignment|capstone|ai.resilien|validity|reliability|fairness|disclosure)\b/.test(lower);
  const broad = /\b(align|coheren|review|whole course|course design|constructive|synthesi[sz]e|overall)\b/.test(lower);
  const noSpecialistSignal = !idel && !assessment;
  return {
    useIdel: idel || (broad && noSpecialistSignal) || (!broad && noSpecialistSignal),
    useAssessment: assessment || (broad && noSpecialistSignal) || (!broad && noSpecialistSignal),
  };
}

async function callSpecialist(
  runner: (request: Request) => Promise<Response>,
  payload: { message: string; canvas: unknown },
  userId: string,
) {
  let lastError = "Specialist analysis failed.";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await runner(new Request("http://internal/specialist", {
      method: "POST",
      headers: { "Content-Type": "application/json", "oai-authenticated-user-id": userId },
      body: JSON.stringify(payload),
    }));
    const body = await response.json() as { result?: SpecialistResult; error?: string };
    if (response.ok && body.result) return body.result;
    lastError = body.error || lastError;
  }
  throw new Error(lastError);
}

export async function POST(request: Request) {
  try {
    const userId = authenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    const body = await request.json() as { message?: unknown; canvas?: unknown; enabledSpecialists?: unknown };
    const message = cleanText(body.message);
    if (!message) return NextResponse.json({ error: "Please enter a request for Course Coherence." }, { status: 400 });

    const apiKey = process.env.AWS_BEARER_TOKEN_BEDROCK;
    const region = process.env.AWS_REGION ?? "ap-southeast-2";
    const modelId = process.env.BEDROCK_MODEL_ID ?? "amazon.nova-lite-v1:0";
    if (!apiKey) return NextResponse.json({ error: "Course Coherence has not been connected to Bedrock." }, { status: 503 });

    const hasManualSelection = Array.isArray(body.enabledSpecialists);
    const enabledSpecialists = hasManualSelection
      ? (body.enabledSpecialists as unknown[]).filter((value): value is "idel" | "assessment" | "ai4learn" => value === "idel" || value === "assessment" || value === "ai4learn")
      : [];
    if (hasManualSelection && !enabledSpecialists.length) {
      return NextResponse.json({ error: "Turn on at least one available subagent." }, { status: 400 });
    }
    const automaticRouting = routeRequest(message);
    const routing = hasManualSelection
      ? { useIdel: enabledSpecialists.includes("idel"), useAssessment: enabledSpecialists.includes("assessment") }
      : automaticRouting;
    const requested: Array<{ name: string; run: Promise<SpecialistResult> }> = [];
    if (routing.useIdel) requested.push({ name: "IDEL Aligner", run: callSpecialist(runIdel, { message, canvas: body.canvas }, userId) });
    if (routing.useAssessment) requested.push({ name: "Assessment Designer", run: callSpecialist(runAssessment, { message, canvas: body.canvas }, userId) });
    if (enabledSpecialists.includes("ai4learn")) requested.push({ name: "AI 4Learn", run: callSpecialist(runInstructionalApproaches, { message, canvas: body.canvas }, userId) });

    const settled = await Promise.allSettled(requested.map((item) => item.run));
    const specialistOutputs = settled.flatMap((result, index) => result.status === "fulfilled" ? [{ name: requested[index].name, result: result.value }] : []);
    const failedSpecialists = settled.flatMap((result, index) => result.status === "rejected" ? [requested[index].name] : []);
    if (!specialistOutputs.length) return NextResponse.json({ error: "The specialist analyses could not be completed. Please try again." }, { status: 502 });

    const contributors = specialistOutputs.map((item) => item.name);
    const responseShape = {
      summary: "One coherent constructive-alignment synthesis in plain UK English.",
      contributors,
      questions: ["Only questions whose answers materially affect the recommendation"],
      subagentFindings: [{ agent: "IDEL Aligner, Assessment Designer or AI 4Learn", observation: "Concrete evidence", recommendation: "Reconciled recommendation" }],
      proposals: [{ target: "courseInformation | courseAims | outcomes | topics | assessment | approaches | schedule", action: "add | revise", rowIndex: "number for revise only", rationale: "constructive-alignment rationale", item: "complete target-specific object" }],
      cautions: ["Assumptions, trade-offs or unresolved conflicts"],
      nextStep: "Single most useful next action",
    };

    const synthesisPrompt = `You are Course Coherence, the always-on constructive-alignment orchestrator for a university Course Agentic Planner. You coordinate specialist subagents and return one coherent recommendation to the educator.

Constructive alignment means that course aims, intended learning outcomes, content, assessment evidence, learning and teaching approaches, weekly activities, programme outcomes and CCS+ mappings reinforce one another. Preserve the educator's intent. Never change the canvas directly. Reconcile duplication or conflict between specialists rather than concatenating their answers.

The IDEL Aligner and Assessment Designer are Course Coherence subagents. Instructional Approaches is an always-on activity-design orchestrator; its currently available AI 4Learn specialist may also contribute. Project-based Learning, Collaborative Knowledge Building and the CCS+ Evaluator are not yet implemented; do not imply that they were consulted or make authoritative CCS+ judgements. You may identify a CCS+ mapping that needs later review.

${OBTL_WRITING_STANDARD}

Return strict JSON only, with no markdown, matching this shape:
${JSON.stringify(responseShape)}

Rules:
- contributors must contain exactly these successful specialists: ${JSON.stringify(contributors)}.
- Use the specialists' concrete evidence and preserve important cautions.
- The canvas includes lockedSections. Never propose a change to a locked section. Check this before choosing proposal targets. If every relevant section is locked, return no proposals and explain what should be unlocked.
- Any section not listed in lockedSections may be changed when the educator's request and constructive alignment justify it.
- Ask only essential questions not answered by the canvas.
- Produce a focused set of 1–4 proposals. Each proposal uses one target only.
- A revise proposal must retain the correct zero-based rowIndex and provide a complete replacement item.
- Use item {courseCode, courseTitle} for courseInformation; {courseAims} for courseAims; {outcome} for outcomes; {topic} for topics; the established complete row shape for table targets.
- Do not allow assessment weightings to exceed 100%. When redistribution needs educator judgement, leave new weighting blank or zero and explain it.
- Remove duplicate or incompatible proposals. If specialists disagree, explain the trade-off in cautions.
- Recommendations remain subject to educator approval.
${failedSpecialists.length ? `- These specialists failed and must not be represented as contributors: ${failedSpecialists.join(", ")}.` : ""}

Educator request:
${message}

Current canvas:
${JSON.stringify(body.canvas)}

Specialist outputs:
${JSON.stringify(specialistOutputs)}`;

    const response = await fetch(`https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: [{ text: synthesisPrompt }] }], inferenceConfig: { maxTokens: 2_800, temperature: 0.15, topP: 0.9 } }),
    });
    if (!response.ok) return NextResponse.json({ error: "Course Coherence could not synthesise the specialist recommendations." }, { status: 502 });

    const bedrock = await response.json() as { output?: { message?: { content?: Array<{ text?: string }> } }; usage?: unknown };
    const text = bedrock.output?.message?.content?.map((part) => part.text ?? "").join("").trim();
    if (!text) return NextResponse.json({ error: "Course Coherence returned an empty synthesis." }, { status: 502 });

    const result = extractJson(text) as Record<string, unknown>;
    result.contributors = contributors;
    if (Array.isArray(result.proposals)) result.proposals = result.proposals.slice(0, 4);
    if (Array.isArray(result.subagentFindings)) result.subagentFindings = result.subagentFindings.slice(0, 8);
    if (Array.isArray(result.questions)) result.questions = result.questions.filter(Boolean).slice(0, 3);
    return NextResponse.json({ result, routing: contributors, usage: bedrock.usage });
  } catch (error) {
    console.error("Course Coherence error", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Course Coherence could not complete the request. Please try again." }, { status: 500 });
  }
}
