import os
import json
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from anthropic import Anthropic
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

load_dotenv()

from db import engine, init_db, users, profiles, plans, progress
from auth import verify_token

client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

app = FastAPI(title="GRAPH Coach API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


# ---------- Models ----------


class BreakdownItem(BaseModel):
    label: str
    score: float


class CoachRequest(BaseModel):
    signature: str
    score: int
    topBlocker: str
    timeframeMonths: int
    breakdown: list[BreakdownItem]
    utilization: float
    dti: float
    onTimePaymentRate: float
    hardInquiries: int
    savings: float
    monthlyPaydownCapacity: float = 0
    affordability: str = "moderate"


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
    monthlyPaydownCapacity: float = 0
    affordability: str = "moderate"


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
    signature: str
    score: int
    topBlocker: str
    timeframeMonths: int
    breakdown: list[BreakdownItem]
    utilization: float
    dti: float
    onTimePaymentRate: float
    hardInquiries: int
    savings: float
    monthlyPaydownCapacity: float = 0
    affordability: str = "moderate"


class Habit(BaseModel):
    id: str
    label: str
    factor: str
    why: str


class Stop(BaseModel):
    id: str
    month: int
    kind: str
    title: str
    factor: str
    action: str
    impact: str
    cost: str = "free"


class PlanResponse(BaseModel):
    habits: list[Habit]
    stops: list[Stop]
    source: str = "ai"


class DisputeRequest(BaseModel):
    letterType: str
    fullName: str
    address: str
    recipient: str
    itemDescription: str
    reasonInaccurate: str


class DisputeResponse(BaseModel):
    letter: str
    guidance: str


class ProfilePayload(BaseModel):
    data: dict
    onboarded: bool


class ProgressPayload(BaseModel):
    activeHabits: list[str]
    doneStops: list[str]


# ---------- Prompts ----------

MISSIONS_SYSTEM_PROMPT = """You are GRAPH Coach, a credit and mortgage-readiness coach.
You are given a user's already-computed financial metrics. Do NOT recalculate \
scores — trust the numbers provided. Translate them into prioritized, actionable \
coaching missions grounded in real credit principles:

- Credit utilization: keep below 30%, ideally below 10%. Paying before the \
statement closing date lowers reported utilization.
- Payment history is the single largest scoring factor.
- Debt-to-income (DTI): mortgage lenders want total DTI under 43%, ideally under 36%.
- Hard inquiries cause small temporary dips and age off over ~12 months.
- Cash reserves strengthen a mortgage application.

CRITICAL — AFFORDABILITY. You are told the user's spare monthly capacity to pay down \
debt and an affordability tier. If the tier is "none" or "tight", advice like "pay \
down your balances" is UNREACHABLE. In that case, lead with NO-COST levers:
- Request a credit limit increase (soft pull, avoids a hard inquiry).
- Dispute genuinely inaccurate items (FCRA 15 U.S.C. 1681i; 30-day investigation).
- Request debt validation from collectors under the FDCPA.
- Correct inaccurate personal information.
- Ask a creditor for a goodwill adjustment on an isolated late payment.
- Keep every payment on time.
Never tell someone to dispute ACCURATE information — bureaus reject it as frivolous \
and it can harm them.

Return between 1 and 4 missions, ordered by priority (1 = most urgent). Be specific \
and encouraging, never alarming, never imply guaranteed point gains.

Respond with ONLY a JSON object, no prose, no markdown fences, exactly:
{"missions":[{"factor":"...","title":"...","detail":"...","impact":"...","priority":1}]}"""


CHAT_SYSTEM_PROMPT = """You are GRAPH Coach, a friendly credit and mortgage-readiness \
coach embedded in an app. You are chatting with a user working toward buying a home.

Ground your advice in real credit principles: keep utilization under 30% (ideally \
under 10%), pay on time (the biggest scoring factor), keep DTI under 43% for \
mortgages (ideally under 36%), limit hard inquiries, and build cash reserves.

AFFORDABILITY MATTERS. The user's spare monthly paydown capacity is given below. If it \
is low or zero, do NOT default to "pay down your balances" — that advice is unreachable \
and unhelpful. Surface free levers instead: credit limit increases (soft pull), \
disputing genuinely inaccurate items (FCRA 1681i, 30-day investigation), debt \
validation from collectors (FDCPA), correcting personal-info errors, goodwill \
adjustments, and always paying on time. Never advise disputing accurate information.

Guidelines:
- Be concise and conversational — a few sentences, not an essay.
- Personalize using the metrics below when relevant.
- You are a coach, not a lender or attorney. Don't promise exact score changes or \
guarantee approval, and don't give legal advice — suggest a licensed attorney or a \
HUD-approved housing counselor for legal or complex situations.
- If asked something outside credit/mortgage/personal finance, gently steer back.
- Never ask for or repeat sensitive info like full account numbers or SSNs."""


EXTRACT_SYSTEM_PROMPT = """You extract structured credit data from the raw text of a \
credit report. The text may come from any bureau or format, so reason about the \
content rather than expecting fixed labels.

Extract these fields:
- scoreRange: the credit score bucket. If multiple bureau scores exist, average them. \
Map to exactly one of: "<580", "580-669", "670-739", "740-799", "800+". Null if absent.
- totalCardLimit: SUM of credit limits across REVOLVING accounts only (cards / lines of \
credit). Do NOT include installment loans. Number only. Null if not found.
- totalCardBalance: SUM of current balances across those same REVOLVING accounts only. \
Number only. Null if not found.
- onTimePaymentRate: percentage of on-time payments (0-100) if stated or clearly \
derivable. Null otherwise.
- numAccounts: number of currently OPEN accounts. Null if not found.
- hardInquiries: number of hard inquiries. Null if not found.

Critical: distinguish revolving (cards) from installment (loans). Utilization only \
applies to revolving credit. Only list a field in foundFields if actually found.

Respond with ONLY a JSON object, no prose, no markdown fences, exactly:
{"data":{"scoreRange":"740-799","totalCardLimit":23000,"totalCardBalance":1440,\
"onTimePaymentRate":null,"numAccounts":8,"hardInquiries":2},\
"foundFields":["scoreRange","totalCardLimit","totalCardBalance","numAccounts","hardInquiries"]}"""


PLAN_SYSTEM_PROMPT = """You are GRAPH Coach. Credit improvement is CONTINUOUS and \
SIMULTANEOUS, not one-factor-at-a-time. Build a plan with two parts.

PART 1 — HABITS (always-on, sustained EVERY month). Ongoing behaviors that never \
"complete." Give 3 to 5. Each: short label, the factor it supports, one-line "why".

PART 2 — STOPS (exactly one per month, months 1..N, in order). Each stop has a "kind":
- "milestone": a discrete, one-time action completed that month.
- "checkpoint": no new discrete action — sustain habits and let prior changes \
re-report. Be honest; do NOT invent busywork.
Each stop also has a "cost": "free" if it requires no money, "money" otherwise.

CRITICAL — AFFORDABILITY. If the affordability tier is "none" or "tight", paydown \
milestones are UNREACHABLE. Build the plan almost entirely from FREE actions:
- Request a credit limit increase (soft pull) to lower utilization at zero cost.
- Dispute genuinely inaccurate items (FCRA 15 U.S.C. 1681i, 30-day investigation).
- Request debt validation from collectors (FDCPA).
- Correct inaccurate personal information on the report.
- Request a goodwill adjustment for an isolated late payment.
- Pay every bill on time.
- Small, realistic paydowns sized to their ACTUAL stated capacity — never larger.
Never suggest disputing ACCURATE information. Never suggest a paydown they can't afford.

If the tier is "moderate" or "strong", include paydown milestones sized to their real \
capacity, alongside free levers.

Front-load the weakest factors. After a milestone that changes credit data, the NEXT \
month is usually a checkpoint because changes re-report after the statement cycle. \
Longer timeframes naturally have MORE checkpoints. Reserve the final 1-2 months for \
mortgage prep.

Valid factor values: "Utilization", "Debt-to-income", "Payment history", \
"Recent inquiries", "Savings buffer", "Mortgage prep", "Disputes".

Respond with ONLY a JSON object, no prose, no markdown fences, exactly:
{"habits":[{"id":"h1","label":"...","factor":"...","why":"..."}],\
"stops":[{"id":"s1","month":1,"kind":"milestone","title":"...","factor":"...",\
"action":"...","impact":"...","cost":"free"}]}"""


DISPUTE_SYSTEM_PROMPT = """You draft consumer credit letters grounded ONLY in real \
federal statute. You are drafting on behalf of the consumer, in their voice.

Legal grounding by letter type:
- bureau_dispute: FCRA, 15 U.S.C. 1681i. The consumer disputes information they \
believe is INACCURATE. The bureau must conduct a reasonable reinvestigation, generally \
within 30 days, and delete or correct information that cannot be verified.
- debt_validation: FDCPA, 15 U.S.C. 1692g. Within 30 days of a collector's initial \
communication, the consumer may request verification; the collector must cease \
collection until it provides verification.
- personal_info: FCRA 1681i applied to inaccurate identifying information.
- goodwill: NOT a legal right. A polite request asking a creditor to remove an isolated \
late payment as a courtesy. Say plainly the creditor is under no obligation to agree.

HARD RULES:
- Plain, factual, respectful language. A calm, specific letter is far more effective \
than an aggressive one.
- Cite statute accurately and sparingly. Do NOT invent legal theories.
- NEVER include sovereign-citizen or pseudo-legal claims. Do NOT claim the furnisher \
lacked "permissible purpose", do NOT allege the creditor "illegally obtained" or "sold" \
their information, do NOT demand cease-and-desist of accurate reporting, do NOT invoke \
UCC or "natural person" framing. These arguments are false, they fail, and they can get \
the consumer's disputes flagged as frivolous.
- Only dispute information the consumer states is genuinely inaccurate.
- Do not include SSNs or full account numbers. Use placeholders like [last 4 digits].
- Do not guarantee deletion or a score change.

Also return short practical "guidance": how to send it (certified mail, return receipt \
requested), what to enclose, the ~30-day timeline, and to keep copies. Note this is not \
legal advice and a licensed attorney or HUD-approved housing counselor can help.

Respond with ONLY a JSON object, no prose, no markdown fences, exactly:
{"letter":"...full letter text with \\n line breaks...","guidance":"...short paragraph..."}"""


# ---------- Helpers ----------


def _model_json(system: str, content: str, max_tokens: int) -> dict:
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": content}],
    )
    raw = "".join(b.text for b in message.content if b.type == "text").strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1].replace("json", "", 1).strip()
    return json.loads(raw)


def _ensure_user(uid: str, email: str | None = None) -> None:
    stmt = insert(users).values(uid=uid, email=email)
    stmt = stmt.on_conflict_do_nothing(index_elements=["uid"])
    with engine.begin() as conn:
        conn.execute(stmt)


# ---------- Profile ----------


@app.get("/api/profile")
def get_profile(uid: str = Depends(verify_token)):
    with engine.connect() as conn:
        row = conn.execute(
            select(profiles.c.data, profiles.c.onboarded).where(profiles.c.uid == uid)
        ).first()

    if not row:
        return {"data": None, "onboarded": False}

    return {"data": row.data, "onboarded": row.onboarded == "true"}


@app.put("/api/profile")
def put_profile(payload: ProfilePayload, uid: str = Depends(verify_token)):
    _ensure_user(uid)

    stmt = insert(profiles).values(
        uid=uid,
        data=payload.data,
        onboarded="true" if payload.onboarded else "false",
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["uid"],
        set_={"data": stmt.excluded.data, "onboarded": stmt.excluded.onboarded},
    )

    with engine.begin() as conn:
        conn.execute(stmt)

    return {"ok": True}


# ---------- Progress ----------


@app.get("/api/progress")
def get_progress(uid: str = Depends(verify_token)):
    with engine.connect() as conn:
        row = conn.execute(
            select(progress.c.active_habits, progress.c.done_stops).where(
                progress.c.uid == uid
            )
        ).first()

    if not row:
        return {"activeHabits": [], "doneStops": []}

    return {"activeHabits": row.active_habits, "doneStops": row.done_stops}


@app.put("/api/progress")
def put_progress(payload: ProgressPayload, uid: str = Depends(verify_token)):
    _ensure_user(uid)

    stmt = insert(progress).values(
        uid=uid,
        active_habits=payload.activeHabits,
        done_stops=payload.doneStops,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["uid"],
        set_={
            "active_habits": stmt.excluded.active_habits,
            "done_stops": stmt.excluded.done_stops,
        },
    )

    with engine.begin() as conn:
        conn.execute(stmt)

    return {"ok": True}


# ---------- Missions (cached in DB) ----------


@app.post("/api/coach/missions", response_model=CoachResponse)
def generate_missions(req: CoachRequest, uid: str = Depends(verify_token)):
    _ensure_user(uid)

    # Missions derive from the same profile as the plan, so they share its
    # signature. If it matches what we stored, serve from Postgres — no model call.
    with engine.connect() as conn:
        row = conn.execute(
            select(plans.c.missions, plans.c.signature).where(plans.c.uid == uid)
        ).first()

    if row and row.signature == req.signature and row.missions:
        return CoachResponse(missions=row.missions)

    breakdown_str = ", ".join(f"{b.label}={b.score:.0f}" for b in req.breakdown)
    user_content = f"""User metrics:
- Overall readiness: {req.score}%
- Goal timeframe: {req.timeframeMonths} months
- Top blocker (weakest factor): {req.topBlocker}
- Credit utilization: {req.utilization:.0f}%
- Debt-to-income: {req.dti:.0f}%
- On-time payment rate: {req.onTimePaymentRate:.0f}%
- Hard inquiries (12mo): {req.hardInquiries}
- Savings: ${req.savings:,.0f}
- Spare monthly paydown capacity: ${req.monthlyPaydownCapacity:,.0f}
- Affordability tier: {req.affordability}
- Factor breakdown (0-100, higher=healthier): {breakdown_str}"""

    try:
        result = CoachResponse(
            **_model_json(MISSIONS_SYSTEM_PROMPT, user_content, 1500)
        )
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Model returned invalid JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    stored = [m.model_dump() for m in result.missions]

    # Upsert onto the plan row. If no plan exists yet, this seeds a row that
    # /api/coach/plan will fill in with habits and stops.
    stmt = insert(plans).values(
        uid=uid,
        signature=req.signature,
        data={"habits": [], "stops": []},
        missions=stored,
        source="ai",
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["uid"],
        set_={
            "signature": stmt.excluded.signature,
            "missions": stmt.excluded.missions,
        },
    )
    with engine.begin() as conn:
        conn.execute(stmt)

    return result


# ---------- Plan (cached in DB) ----------


@app.post("/api/coach/plan", response_model=PlanResponse)
def generate_plan(req: PlanRequest, uid: str = Depends(verify_token)):
    _ensure_user(uid)

    # Return the stored plan if it was built from the same profile signature.
    # This is why the LLM doesn't rebuild the roadmap on every login.
    with engine.connect() as conn:
        row = conn.execute(
            select(plans.c.data, plans.c.signature, plans.c.source).where(
                plans.c.uid == uid
            )
        ).first()

    if row and row.signature == req.signature and row.data.get("stops"):
        return PlanResponse(**row.data, source=row.source)

    n = max(1, min(req.timeframeMonths, 36))
    breakdown_str = ", ".join(f"{b.label}={b.score:.0f}" for b in req.breakdown)

    user_content = f"""Build a plan for this user over {n} months:
- Overall readiness: {req.score}%
- Goal timeframe (months): {n}
- Top blocker (weakest factor): {req.topBlocker}
- Credit utilization: {req.utilization:.0f}%
- Debt-to-income: {req.dti:.0f}%
- On-time payment rate: {req.onTimePaymentRate:.0f}%
- Hard inquiries (12mo): {req.hardInquiries}
- Savings: ${req.savings:,.0f}
- Spare monthly paydown capacity: ${req.monthlyPaydownCapacity:,.0f}
- Affordability tier: {req.affordability}
- Factor breakdown (0-100, higher=healthier): {breakdown_str}

Return EXACTLY {n} stops, one per month numbered 1 through {n}, in ascending order. \
Mark months with no discrete action as kind="checkpoint". Set cost="free" or \
cost="money" honestly for each stop."""

    try:
        data = _model_json(PLAN_SYSTEM_PROMPT, user_content, 8000)
        result = PlanResponse(**data)

        by_month: dict[int, Stop] = {}
        for s in result.stops:
            if s.kind not in ("milestone", "checkpoint"):
                s.kind = "checkpoint"
            if s.cost not in ("free", "money"):
                s.cost = "free"
            s.month = max(1, min(s.month, n))
            by_month.setdefault(s.month, s)

        # Long plans are where models drop entries. Fill any gap honestly.
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
                    cost="free",
                )

        result.stops = [by_month[m] for m in range(1, n + 1)]
        result.source = "ai"

        stored = {
            "habits": [h.model_dump() for h in result.habits],
            "stops": [s.model_dump() for s in result.stops],
        }

        # Note: `missions` is deliberately absent from set_, so an existing
        # missions payload survives a plan write.
        stmt = insert(plans).values(
            uid=uid, signature=req.signature, data=stored, source="ai"
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["uid"],
            set_={
                "signature": stmt.excluded.signature,
                "data": stmt.excluded.data,
                "source": stmt.excluded.source,
            },
        )
        with engine.begin() as conn:
            conn.execute(stmt)

        return result

    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Model returned invalid JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------- Coach ----------


@app.post("/api/coach/chat", response_model=ChatResponse)
def chat(req: ChatRequest, uid: str = Depends(verify_token)):
    ctx = req.context
    context_block = f"""The user's current profile:
- Overall readiness: {ctx.score}%
- Credit score range: {ctx.scoreRange}
- Goal: buy a home in {ctx.timeframeMonths} months
- Top blocker: {ctx.topBlocker}
- Credit utilization: {ctx.utilization:.0f}%
- Debt-to-income: {ctx.dti:.0f}%
- On-time payment rate: {ctx.onTimePaymentRate:.0f}%
- Hard inquiries (12mo): {ctx.hardInquiries}
- Savings: ${ctx.savings:,.0f}
- Spare monthly paydown capacity: ${ctx.monthlyPaydownCapacity:,.0f}
- Affordability tier: {ctx.affordability}"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1000,
            system=CHAT_SYSTEM_PROMPT + "\n\n" + context_block,
            messages=[{"role": m.role, "content": m.content} for m in req.messages],
        )
        reply = "".join(b.text for b in message.content if b.type == "text").strip()
        return ChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/credit/extract", response_model=ExtractResponse)
def extract_credit(req: ExtractRequest, uid: str = Depends(verify_token)):
    if not req.text or len(req.text.strip()) < 20:
        raise HTTPException(
            status_code=422,
            detail="No readable text in the document (it may be a scanned image).",
        )
    text = req.text[:60000]
    try:
        return ExtractResponse(
            **_model_json(
                EXTRACT_SYSTEM_PROMPT, f"Credit report text:\n\n{text}", 1000
            )
        )
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Model returned invalid JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/dispute/letter", response_model=DisputeResponse)
def dispute_letter(req: DisputeRequest, uid: str = Depends(verify_token)):
    valid = {"bureau_dispute", "debt_validation", "personal_info", "goodwill"}
    if req.letterType not in valid:
        raise HTTPException(status_code=422, detail="Unknown letter type")

    user_content = f"""Draft a {req.letterType} letter.

Consumer name: {req.fullName}
Consumer address: {req.address}
Recipient: {req.recipient}
Item in question: {req.itemDescription}
Why the consumer believes it is inaccurate (their own words): {req.reasonInaccurate}

Write the letter in the consumer's voice. If their stated reason does not actually \
describe an inaccuracy — for example, if they simply do not want an accurate debt to \
appear — do NOT write a dispute letter. Instead, return a letter field explaining \
plainly that disputing accurate information is not appropriate and will not work, and \
use the guidance field to suggest legitimate alternatives."""

    try:
        return DisputeResponse(**_model_json(DISPUTE_SYSTEM_PROMPT, user_content, 2000))
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Model returned invalid JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}