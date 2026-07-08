import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

app = FastAPI(title="GRAPH Coach API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class BreakdownItem(BaseModel):
    label: str
    score: float


class CoachRequest(BaseModel):
    score: int
    topBlocker: str
    timeframeMonths: int
    breakdown: list[BreakdownItem]
    utilization: float
    dti: float
    onTimePaymentRate: float
    hardInquiries: int
    savings: float


class Mission(BaseModel):
    factor: str
    title: str
    detail: str
    impact: str
    priority: int


class CoachResponse(BaseModel):
    missions: list[Mission]


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatContext(BaseModel):
    score: int
    topBlocker: str
    timeframeMonths: int
    utilization: float
    dti: float
    onTimePaymentRate: float
    hardInquiries: int
    savings: float
    scoreRange: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: ChatContext


class ChatResponse(BaseModel):
    reply: str


class ExtractRequest(BaseModel):
    text: str


class ExtractedCredit(BaseModel):
    scoreRange: str | None = None
    totalCardLimit: float | None = None
    totalCardBalance: float | None = None
    onTimePaymentRate: float | None = None
    numAccounts: int | None = None
    hardInquiries: int | None = None


class ExtractResponse(BaseModel):
    data: ExtractedCredit
    foundFields: list[str]


class PlanRequest(BaseModel):
    score: int
    topBlocker: str
    timeframeMonths: int
    breakdown: list[BreakdownItem]
    utilization: float
    dti: float
    onTimePaymentRate: float
    hardInquiries: int
    savings: float


class Habit(BaseModel):
    id: str
    label: str
    factor: str
    why: str


class Stop(BaseModel):
    id: str
    month: int
    kind: str  # "milestone" | "checkpoint"
    title: str
    factor: str
    action: str
    impact: str


class PlanResponse(BaseModel):
    habits: list[Habit]
    stops: list[Stop]


MISSIONS_SYSTEM_PROMPT = """You are GRAPH Coach, a credit and mortgage-readiness coach.
You are given a user's already-computed financial metrics. Do NOT recalculate \
scores — trust the numbers provided. Your job is to translate them into \
prioritized, actionable coaching missions grounded in real credit principles:

- Credit utilization: keep below 30%, ideally below 10%. Paying before the \
statement closing date lowers reported utilization.
- Payment history is the single largest scoring factor; on-time payment is critical.
- Debt-to-income (DTI): mortgage lenders typically want total DTI under 43%, \
ideally under 36%.
- Hard inquiries cause small temporary dips and age off over ~12 months.
- Cash reserves/savings strengthen a mortgage application (down payment, \
closing costs, reserves).

Return between 1 and 4 missions, ordered by priority (1 = most urgent), \
targeting the user's weakest areas. Be specific and encouraging, never alarming.

Respond with ONLY a JSON object, no prose, no markdown fences, in exactly this shape:
{"missions":[{"factor":"...","title":"...","detail":"...","impact":"...","priority":1}]}"""


CHAT_SYSTEM_PROMPT = """You are GRAPH Coach, a friendly credit and mortgage-readiness \
coach embedded in an app. You are chatting with a user working toward buying a home.

Ground your advice in real credit principles: keep utilization under 30% (ideally \
under 10%), pay on time (payment history is the biggest scoring factor), keep DTI \
under 43% for mortgages (ideally under 36%), limit hard inquiries, and build cash \
reserves for down payment and closing costs.

Guidelines:
- Be concise and conversational — a few sentences, not an essay. This is a chat.
- Personalize using the user's metrics provided below when relevant.
- Be encouraging and practical. Give concrete next steps.
- You are a coach, not a lender. Don't promise exact score changes or guarantee \
approval — frame point estimates as approximate.
- If asked something outside credit/mortgage/personal finance, gently steer back.
- Never ask for or repeat sensitive info like full account numbers or SSNs."""


EXTRACT_SYSTEM_PROMPT = """You extract structured credit data from the raw text of a \
credit report. The text may come from any bureau or format (Experian, Equifax, \
TransUnion, Credit Karma, annualcreditreport.com, or a custom layout), so reason \
about the content rather than expecting fixed labels.

Extract these fields:
- scoreRange: the person's credit score bucket. If multiple bureau scores exist, \
average them. Map the number to exactly one of: "<580", "580-669", "670-739", \
"740-799", "800+". If no score is present, use null.
- totalCardLimit: the SUM of credit limits across REVOLVING accounts only (credit \
cards / lines of credit). Do NOT include installment loans (auto, student, mortgage, \
personal loans). Number only, no currency symbols. Null if not found.
- totalCardBalance: the SUM of current balances across those same REVOLVING accounts \
only. Do NOT include installment loan balances. Number only. Null if not found.
- onTimePaymentRate: percentage of on-time payments (0-100) if stated or clearly \
derivable. Null if not determinable.
- numAccounts: number of currently OPEN accounts. Null if not found.
- hardInquiries: number of hard inquiries (typically in the last 12 months). Null if \
not found.

Critical rules:
- Distinguish revolving (cards) from installment (loans). Utilization only applies to \
revolving credit. This distinction matters most.
- Only include a field in foundFields if you actually found it in the text (not null).
- Return numbers as plain numbers, not strings, no "$" or commas.

Respond with ONLY a JSON object, no prose, no markdown fences, in exactly this shape:
{"data":{"scoreRange":"740-799","totalCardLimit":23000,"totalCardBalance":1440,\
"onTimePaymentRate":null,"numAccounts":8,"hardInquiries":2},\
"foundFields":["scoreRange","totalCardLimit","totalCardBalance","numAccounts","hardInquiries"]}"""


PLAN_SYSTEM_PROMPT = """You are GRAPH Coach. Credit improvement is CONTINUOUS and \
SIMULTANEOUS, not one-factor-at-a-time. Build a plan with two parts.

PART 1 — HABITS (always-on, sustained EVERY month for the whole timeframe). Ongoing \
behaviors that never "complete." Give 3 to 5. Examples: pay every bill on time, keep \
card utilization low, avoid new hard inquiries, save each month. Each: short label, \
the factor it supports, one-line "why".

PART 2 — STOPS (exactly one per month, months 1..N, in order). Every month gets a \
stop. Each stop has a "kind":
- "milestone": a discrete, one-time action the user completes that month (e.g. pay a \
specific card below 30% before its statement date, request a credit limit increase, \
dispute an error, get pre-approved, gather income documents).
- "checkpoint": a month with no new discrete action — the work is sustaining the \
habits and letting prior changes re-report. Be honest about this; do NOT invent busywork.

Design realistically. Front-load milestones on the user's weakest factors. After a \
milestone that changes credit data, the NEXT month is usually a checkpoint because \
changes re-report after the statement cycle. Longer timeframes naturally have MORE \
checkpoints — that's correct and expected, don't pad them with fake tasks. Reserve \
the final 1-2 months for mortgage prep (pre-approval, document gathering, avoid new \
credit).

For each stop: id (unique string), month (1..N), kind, a short title (2-5 words), the \
factor, one concrete sentence for "action" (for checkpoints, describe what to sustain \
and what's re-reporting), and a short "impact" phrase.

Ground everything in real principles: utilization under 30% (ideally <10%), on-time \
payments are the biggest factor, DTI under 43% (ideally <36%), inquiries age off over \
~12 months, cash reserves strengthen the application. Be encouraging; never imply \
guaranteed point gains.

Valid factor values: "Utilization", "Debt-to-income", "Payment history", \
"Recent inquiries", "Savings buffer", "Mortgage prep".

Respond with ONLY a JSON object, no prose, no markdown fences, exactly:
{"habits":[{"id":"h1","label":"...","factor":"...","why":"..."}],\
"stops":[{"id":"s1","month":1,"kind":"milestone","title":"...","factor":"...",\
"action":"...","impact":"..."}]}"""


@app.post("/api/coach/missions", response_model=CoachResponse)
def generate_missions(req: CoachRequest):
    user_content = f"""User metrics:
- Overall readiness: {req.score}%
- Goal timeframe: {req.timeframeMonths} months
- Top blocker (weakest factor): {req.topBlocker}
- Credit utilization: {req.utilization:.0f}%
- Debt-to-income: {req.dti:.0f}%
- On-time payment rate: {req.onTimePaymentRate:.0f}%
- Hard inquiries (12mo): {req.hardInquiries}
- Savings: ${req.savings:,.0f}
- Factor breakdown (0-100, higher=healthier): """ + ", ".join(
        f"{b.label}={b.score:.0f}" for b in req.breakdown
    )

    try:
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1500,
            system=MISSIONS_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        )
        raw = "".join(
            block.text for block in message.content if block.type == "text"
        ).strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1].replace("json", "", 1).strip()
        data = json.loads(raw)
        return CoachResponse(**data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Model returned invalid JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/coach/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    ctx = req.context
    context_block = f"""The user's current profile (for personalizing answers):
- Overall readiness: {ctx.score}%
- Credit score range: {ctx.scoreRange}
- Goal: buy a home in {ctx.timeframeMonths} months
- Top blocker: {ctx.topBlocker}
- Credit utilization: {ctx.utilization:.0f}%
- Debt-to-income: {ctx.dti:.0f}%
- On-time payment rate: {ctx.onTimePaymentRate:.0f}%
- Hard inquiries (12mo): {ctx.hardInquiries}
- Savings: ${ctx.savings:,.0f}"""

    system = CHAT_SYSTEM_PROMPT + "\n\n" + context_block
    api_messages = [{"role": m.role, "content": m.content} for m in req.messages]

    try:
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1000,
            system=system,
            messages=api_messages,
        )
        reply = "".join(
            block.text for block in message.content if block.type == "text"
        ).strip()
        return ChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/credit/extract", response_model=ExtractResponse)
def extract_credit(req: ExtractRequest):
    if not req.text or len(req.text.strip()) < 20:
        raise HTTPException(
            status_code=422,
            detail="No readable text in the document (it may be a scanned image).",
        )
    text = req.text[:60000]
    try:
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1000,
            system=EXTRACT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Credit report text:\n\n{text}"}],
        )
        raw = "".join(
            block.text for block in message.content if block.type == "text"
        ).strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1].replace("json", "", 1).strip()
        parsed = json.loads(raw)
        return ExtractResponse(**parsed)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Model returned invalid JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/coach/plan", response_model=PlanResponse)
def generate_plan(req: PlanRequest):
    # One stop per month across the full timeframe. Guard the upper bound only
    # to keep a single model call reasonable.
    n = max(1, min(req.timeframeMonths, 36))

    user_content = f"""Build a plan for this user over {n} months:
- Overall readiness: {req.score}%
- Goal timeframe (months): {n}
- Top blocker (weakest factor): {req.topBlocker}
- Credit utilization: {req.utilization:.0f}%
- Debt-to-income: {req.dti:.0f}%
- On-time payment rate: {req.onTimePaymentRate:.0f}%
- Hard inquiries (12mo): {req.hardInquiries}
- Savings: ${req.savings:,.0f}
- Factor breakdown (0-100, higher=healthier): """ + ", ".join(
        f"{b.label}={b.score:.0f}" for b in req.breakdown
    ) + (
        f"\n\nReturn EXACTLY {n} stops, one for each month numbered 1 through {n}, "
        f"in ascending order. Mark months with no discrete action as "
        f'kind="checkpoint".'
    )

    try:
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=8000,
            system=PLAN_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        )
        raw = "".join(
            block.text for block in message.content if block.type == "text"
        ).strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1].replace("json", "", 1).strip()
        data = json.loads(raw)
        result = PlanResponse(**data)

        # Normalize: valid kinds, months in range, sorted, deduped by month.
        by_month: dict[int, Stop] = {}
        for s in result.stops:
            if s.kind not in ("milestone", "checkpoint"):
                s.kind = "checkpoint"
            s.month = max(1, min(s.month, n))
            by_month.setdefault(s.month, s)

        # Fill any month the model skipped with an honest checkpoint.
        for month in range(1, n + 1):
            if month not in by_month:
                by_month[month] = Stop(
                    id=f"s-fill-{month}",
                    month=month,
                    kind="checkpoint",
                    title="Hold steady",
                    factor="Payment history",
                    action=(
                        "No new action this month — keep your habits going and let "
                        "recent changes re-report."
                    ),
                    impact="Consistency compounds",
                )

        result.stops = [by_month[m] for m in range(1, n + 1)]
        return result

    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Model returned invalid JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}