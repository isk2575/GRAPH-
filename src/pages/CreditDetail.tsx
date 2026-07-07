import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useUser } from "../context/UserContext";

export default function CreditDetail() {
  const navigate = useNavigate();
  const { profile } = useUser();
  const { credit, finances } = profile;

  const utilization =
    credit.totalCardLimit > 0
      ? Math.round((credit.totalCardBalance / credit.totalCardLimit) * 100)
      : 0;

  const dti =
    finances.annualIncome > 0
      ? Math.round(
          ((finances.monthlyDebtPayments * 12) / finances.annualIncome) * 100
        )
      : 0;

  return (
    <main className="min-h-screen bg-[#0B0B0C] text-white antialiased">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </button>

        <h1 className="text-3xl font-black tracking-tight">Credit detail</h1>
        <p className="mt-2 text-white/55">Score range: {credit.scoreRange}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Row label="Credit utilization" value={`${utilization}%`} />
          <Row label="Debt-to-income" value={`${dti}%`} />
          <Row
            label="Total card limit"
            value={`$${credit.totalCardLimit.toLocaleString()}`}
          />
          <Row
            label="Total balances"
            value={`$${credit.totalCardBalance.toLocaleString()}`}
          />
          <Row
            label="On-time payments"
            value={`${credit.onTimePaymentRate}%`}
          />
          <Row label="Open accounts" value={String(credit.numAccounts)} />
          <Row
            label="Hard inquiries (12mo)"
            value={String(credit.hardInquiries)}
          />
          <Row
            label="Savings"
            value={`$${finances.savings.toLocaleString()}`}
          />
        </div>

        <button
          onClick={() => navigate("/onboarding")}
          className="mt-8 rounded-full border border-white/[0.12] bg-white/[0.04] px-6 py-3 text-sm font-bold text-white transition hover:bg-white/[0.08]"
        >
          Update my info
        </button>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}