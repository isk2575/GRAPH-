export type LetterType =
  | "bureau_dispute"
  | "debt_validation"
  | "personal_info"
  | "goodwill";

export interface BureauTarget {
  id: "experian" | "equifax" | "transunion";
  name: string;
  mailingAddress: string[];
  onlinePortal: string;
  phone: string;
}

/**
 * Bureau dispute addresses, verified against each bureau's own dispute page.
 * These do change occasionally — the UI links to the source page so users can
 * confirm before mailing.
 */
export const BUREAUS: BureauTarget[] = [
  {
    id: "experian",
    name: "Experian",
    mailingAddress: ["Experian", "P.O. Box 4500", "Allen, TX 75013"],
    onlinePortal: "https://www.experian.com/help/dispute-credit/",
    phone: "(888) 397-3742",
  },
  {
    id: "equifax",
    name: "Equifax",
    mailingAddress: [
      "Equifax Information Services, LLC",
      "P.O. Box 740256",
      "Atlanta, GA 30374-0256",
    ],
    onlinePortal:
      "https://www.equifax.com/personal/credit-report-services/credit-dispute/",
    phone: "(866) 349-5191",
  },
  {
    id: "transunion",
    name: "TransUnion",
    mailingAddress: [
      "TransUnion LLC",
      "Consumer Dispute Center",
      "P.O. Box 2000",
      "Chester, PA 19016",
    ],
    onlinePortal:
      "https://www.transunion.com/credit-disputes/dispute-your-credit",
    phone: "(800) 916-8800",
  },
];

/** What to put in the envelope. Sourced from CFPB dispute guidance. */
export const MAILING_CHECKLIST = [
  "Your full name, address, and phone number",
  "A copy of the report section with the disputed item circled or highlighted",
  "Copies (never originals) of documents supporting your position",
  "A copy of your photo ID and a utility bill showing the same address",
];

export const CERTIFIED_MAIL_NOTE =
  "Send by certified mail with return receipt requested. The bureau's 30-day investigation clock under FCRA § 1681i starts when they receive your letter — the return receipt is your proof of that date, and your paper trail if you need to escalate to the CFPB.";

/** Which recipient guidance applies to a given letter type. */
export function targetGuidance(type: LetterType): {
  heading: string;
  body: string;
  showBureaus: boolean;
} {
  switch (type) {
    case "bureau_dispute":
      return {
        heading: "Send to the credit bureau",
        body: "Mail it to whichever bureau is reporting the error. If the same error appears on more than one report, send a separate letter to each — they investigate independently.",
        showBureaus: true,
      };
    case "personal_info":
      return {
        heading: "Send to the credit bureau",
        body: "Mail it to each bureau showing the incorrect name, address, or employer. Include a copy of your photo ID and a utility bill with your correct address.",
        showBureaus: true,
      };
    case "debt_validation":
      return {
        heading: "Send to the collection agency",
        body: "Mail it to the collector who contacted you — the address is on their letter, not on your credit report. Send it within 30 days of their first contact to preserve your FDCPA § 1692g rights. They must pause collection until they validate the debt.",
        showBureaus: false,
      };
    case "goodwill":
      return {
        heading: "Send to your creditor",
        body: "Mail it to the original creditor — the bank or card issuer, not a bureau and not a collector. Their address is usually on your statement or on the tradeline in your credit report. This is a courtesy request; they are not obligated to agree.",
        showBureaus: false,
      };
  }
}

/** Maps a plan stop's factor/title to a suggested letter type, if any. */
export function suggestedLetterType(
  factor: string,
  title: string
): LetterType | null {
  const t = title.toLowerCase();
  if (t.includes("goodwill")) return "goodwill";
  if (t.includes("validation") || t.includes("collector")) return "debt_validation";
  if (t.includes("personal info") || t.includes("address") || t.includes("misspell"))
    return "personal_info";
  if (factor === "Disputes" || t.includes("dispute") || t.includes("error"))
    return "bureau_dispute";
  return null;
}