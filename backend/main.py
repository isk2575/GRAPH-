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

# Allow the Vite dev server to call this during development.
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
    # Raw context so the model can be specific
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


SYSTEM_PROMPT = """You are GRAPH Coach, a credit and mortgage-readiness coach.
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
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        )
        raw = "".join(
            block.text for block in message.content if block.type == "text"
        ).strip()

        # Strip accidental markdown fences just in case.
        if raw.startswith("```"):
            raw = raw.split("```")[1].replace("json", "", 1).strip()

        data = json.loads(raw)
        return CoachResponse(**data)

    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Model returned invalid JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}