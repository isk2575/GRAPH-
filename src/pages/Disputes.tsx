import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  Scale,
  Info,
  Mail,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { generateDisputeLetter } from "../lib/coachApi";
import {
  BUREAUS,
  MAILING_CHECKLIST,
  CERTIFIED_MAIL_NOTE,
  targetGuidance,
  type LetterType,
} from "../lib/disputeTargets";

const LETTER_TYPES: {
  type: LetterType;
  label: string;
  blurb: string;
  basis: string;
}[] = [
  {
    type: "bureau_dispute",
    label: "Dispute an inaccurate item",
    blurb:
      "Something on your report is wrong — an account that isn't yours, a wrong balance, a wrong date.",
    basis: "FCRA § 1681i · bureaus must investigate within 30 days",
  },
  {
    type: "debt_validation",
    label: "Request debt validation",
    blurb:
      "A collector contacted you and you want them to prove the debt is real and yours.",
    basis: "FDCPA § 1692g · request within 30 days of first contact",
  },
  {
    type: "personal_info",
    label: "Fix personal information",
    blurb:
      "Misspelled name, an address that was never yours, or an employer you never worked for.",
    basis: "FCRA § 1681i · free to correct",
  },
  {
    type: "goodwill",
    label: "Request a goodwill adjustment",
    blurb:
      "You had one late payment on an otherwise clean account and want to ask the creditor to remove it.",
    basis: "Not a legal right — a courtesy request the creditor may decline",
  },
];

export default function Disputes() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [selected, setSelected] = useState<LetterType | null>(null);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [recipient, setRecipient] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    letter: string;
    guidance: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Deep link from a Journey stop: /disputes?type=goodwill
  useEffect(() => {
    const t = params.get("type") as LetterType | null;
    if (t && LETTER_TYPES.some((lt) => lt.type === t)) {
      setSelected(t);
    }
  }, [params]);

  const canSubmit =
    selected && fullName && address && recipient && itemDescription && reason;

  const submit = async () => {
    if (!canSubmit || !selected) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateDisputeLetter({
        letterType: selected,
        fullName,
        address,
        recipient,
        itemDescription,
        reasonInaccurate: reason,
      });
      setResult(res);
    } catch {
      setError("Couldn't generate the letter. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const guidance = selected ? targetGuidance(selected) : null;

  return (
    <main className="min-h-screen bg-[#0B0B0C] text-white antialiased">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white"
        >
          <ArrowLeft size={16} /> Dashboard
        </button>

        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E50914]/[0.12] text-[#E50914]">
            <Scale size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Free credit actions
            </h1>
            <p className="text-sm text-white/50">
              You don't need money to fix what's inaccurate.
            </p>
          </div>
        </div>

        {/* Honest framing */}
        <div className="mt-6 flex items-start gap-2 rounded-2xl border border-white/[0.08] bg-[#111113] p-4 text-xs leading-relaxed text-white/50">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>
            These letters are only for information that is{" "}
            <strong>genuinely inaccurate</strong>. Disputing accurate debts
            doesn't work — bureaus reject it as frivolous, and it can hurt you.
            GRAPH isn't a law firm and this isn't legal advice; for complex
            situations, a licensed attorney or a HUD-approved housing counselor
            can help, often free.
          </p>
        </div>

        {/* Letter type picker */}
        <div className="mt-8 space-y-3">
          {LETTER_TYPES.map((lt) => (
            <button
              key={lt.type}
              onClick={() => {
                setSelected(lt.type);
                setResult(null);
              }}
              className={`w-full rounded-2xl border p-5 text-left transition ${
                selected === lt.type
                  ? "border-[#E50914]/60 bg-[#E50914]/[0.08]"
                  : "border-white/[0.08] bg-[#141416] hover:bg-white/[0.03]"
              }`}
            >
              <p className="font-bold text-white">{lt.label}</p>
              <p className="mt-1 text-sm text-white/55">{lt.blurb}</p>
              <p className="mt-2 text-xs font-semibold text-[#E50914]">
                {lt.basis}
              </p>
            </button>
          ))}
        </div>

        {/* Where this goes — shown before drafting */}
        {guidance && (
          <div className="mt-8 rounded-[1.5rem] border border-white/[0.08] bg-[#141416] p-6">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-[#E50914]" />
              <h2 className="text-sm font-black uppercase tracking-[0.14em]">
                {guidance.heading}
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              {guidance.body}
            </p>

            {guidance.showBureaus && (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {BUREAUS.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-white/[0.08] bg-[#0F0F11] p-4"
                    >
                      <p className="text-sm font-bold text-white">{b.name}</p>
                      <address className="mt-2 not-italic text-xs leading-relaxed text-white/50">
                        {b.mailingAddress.map((line) => (
                          <span key={line} className="block">
                            {line}
                          </span>
                        ))}
                      </address>
                      <p className="mt-2 text-xs text-white/40">{b.phone}</p>
                      <a
                        href={b.onlinePortal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#E50914] hover:underline"
                    >
                        Dispute online <ExternalLink size={11} />
                    </a>
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-white/[0.08] pt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">
                    Put this in the envelope
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {MAILING_CHECKLIST.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm text-white/60"
                      >
                        <Check
                          size={14}
                          className="mt-0.5 shrink-0 text-[#E50914]"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 flex items-start gap-2 rounded-2xl border border-[#E50914]/25 bg-[#E50914]/[0.06] p-4">
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0 text-[#E50914]"
                  />
                  <p className="text-xs leading-relaxed text-white/65">
                    {CERTIFIED_MAIL_NOTE}
                  </p>
                </div>

                <p className="mt-4 text-xs text-white/35">
                  Addresses change occasionally — the "Dispute online" links go
                  to each bureau's official page, where you can confirm the
                  current one before mailing.
                </p>
              </>
            )}
          </div>
        )}

        {/* Form */}
        {selected && (
          <div className="mt-8 space-y-4">
            <Field
              label="Your full name"
              value={fullName}
              onChange={setFullName}
            />
            <Field
              label="Your address"
              value={address}
              onChange={setAddress}
              placeholder="123 Main St, Houston, TX 77004"
            />
            <Field
              label={
                guidance?.showBureaus ? "Which bureau?" : "Who are you writing to?"
              }
              value={recipient}
              onChange={setRecipient}
              placeholder={
                selected === "debt_validation"
                  ? "Collection agency name"
                  : selected === "goodwill"
                  ? "Creditor name"
                  : "Experian / Equifax / TransUnion"
              }
            />
            <Field
              label="What item is this about?"
              value={itemDescription}
              onChange={setItemDescription}
              placeholder="Capital One card, opened 2019, showing a $1,400 balance"
            />

            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">
                {selected === "goodwill"
                  ? "What happened, and why should they reconsider?"
                  : "Why do you believe this is inaccurate?"}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Be specific and factual. This account was closed in 2021 but still shows as open."
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-[#E50914]/60 placeholder:text-white/25"
              />
            </div>

            <button
              onClick={submit}
              disabled={!canSubmit || loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#E50914] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#c90812] disabled:opacity-30"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Drafting…
                </>
              ) : (
                "Draft my letter"
              )}
            </button>

            {error && (
              <p className="text-sm font-semibold text-[#E50914]">{error}</p>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-8">
            <div className="rounded-[1.5rem] border border-white/[0.08] bg-[#141416] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-[0.14em]">
                  Your letter
                </h2>
                <button
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/[0.08]"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/80">
                {result.letter}
              </pre>
            </div>

            <div className="mt-4 rounded-2xl border border-[#E50914]/25 bg-[#E50914]/[0.06] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E50914]">
                Before you send it
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                {result.guidance}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-white/70">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-[#E50914]/60 placeholder:text-white/25"
      />
    </div>
  );
}