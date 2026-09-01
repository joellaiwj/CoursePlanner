import { NextResponse } from "next/server";
import { POST as runAi4Learn } from "../ai4learn/route";
import { OBTL_WRITING_STANDARD } from "../../../lib/obtl-guidance";
import { authenticatedUserId } from "../../../lib/request-auth";

export const runtime = "edge";

type SpecialistResult = {
  summary?: string;
  questions?: string[];
  fourLearnFocus?: unknown[];
  samr?: unknown;
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

async function callAi4Learn(payload: { message: string; canvas: unknown }, cookie: string) {
  let lastError = "AI 4Learn analysis failed.";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await runAi4Learn(new Request("http://internal/ai4learn", { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify(payload) }));
    const body = await response.json() as { result?: SpecialistResult; error?: string };
    if (response.ok && body.result) return body.result;
    lastError = body.error || lastError;
  }
  throw new Error(lastError);
}

export async function POST(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    const body = await request.json() as { message?: unknown; canvas?: unknown; enabledSpecialists?: unknown };
    const message = cleanText(body.message);
    if (!message) return NextResponse.json({ error: "Please enter a request for Instructional Approaches." }, { status: 400 });
    const enabled = Array.isArray(body.enabledSpecialists) ? body.enabledSpecialists.filter((item) => item === "ai4learn") : ["ai4learn"];
    if (!enabled.length) return NextResponse.json({ error: "Turn on at least one available instructional-approach subagent." }, { status: 400 });

    const ai4learn = await callAi4Learn({ message, canvas: body.canvas }, request.headers.get("cookie") ?? "");
    const apiKey = process.env.AWS_BEARER_TOKEN_BEDROCK;
    const region = process.env.AWS_REGION ?? "ap-southeast-2";
    const modelId = process.env.BEDROCK_MODEL_ID ?? "amazon.nova-lite-v1:0";
    if (!apiKey) return NextResponse.json({ error: "Instructional Approaches has not been connected to Bedrock." }, { status: 503 });

    const prompt = `You are Instructional Approaches, the always-on orchestrator for learning and teaching activity design in a university Course Agentic Planner. Reconcile specialist advice into a focused, feasible recommendation that supports the intended learning outcomes and complements the course assessment. Preserve educator intent and never edit the canvas directly.

AI 4Learn is currently the only available specialist. Project-based Learning and Collaborative Knowledge Building are not yet implemented; do not imply they were consulted. Use strict JSON only and retain this shape: ${JSON.stringify({ summary: "Coherent synthesis", contributors: ["AI 4Learn"], questions: ["Essential questions only"], subagentFindings: [{ agent: "AI 4Learn", observation: "Evidence", recommendation: "Recommendation" }], proposals: [{ target: "approaches | schedule", action: "add | revise", rowIndex: "number for revise", rationale: "alignment rationale", item: "complete target-specific object" }], cautions: ["Assumptions and safeguards"], nextStep: "Most useful next action" })}

${OBTL_WRITING_STANDARD}

Keep 1–4 proposals, only for approaches or schedule. Preserve valid zero-based rowIndex values and complete replacement items. Ensure every activity makes the learner action, AI role, human judgement and evidence of learning clear. Recommendations remain subject to educator approval.

Educator request: ${message}
Current canvas: ${JSON.stringify(body.canvas)}
AI 4Learn output: ${JSON.stringify(ai4learn)}`;

    const response = await fetch(`https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: [{ text: prompt }] }], inferenceConfig: { maxTokens: 2_400, temperature: 0.15, topP: 0.9 } }) });
    if (!response.ok) return NextResponse.json({ error: "Instructional Approaches could not synthesise the recommendation." }, { status: 502 });
    const bedrock = await response.json() as { output?: { message?: { content?: Array<{ text?: string }> } }; usage?: unknown };
    const text = bedrock.output?.message?.content?.map((part) => part.text ?? "").join("").trim();
    if (!text) return NextResponse.json({ error: "Instructional Approaches returned an empty synthesis." }, { status: 502 });
    const result = extractJson(text) as Record<string, unknown>;
    result.contributors = ["AI 4Learn"];
    if (Array.isArray(result.proposals)) result.proposals = result.proposals.filter((proposal) => proposal && typeof proposal === "object" && ["approaches", "schedule"].includes(String((proposal as Record<string, unknown>).target))).slice(0, 4);
    return NextResponse.json({ result, routing: ["AI 4Learn"], usage: bedrock.usage });
  } catch (error) {
    console.error("Instructional Approaches error", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Instructional Approaches could not complete the request. Please try again." }, { status: 500 });
  }
}
