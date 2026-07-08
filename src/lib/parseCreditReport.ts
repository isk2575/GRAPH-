import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const API_BASE = "http://localhost:8000";

export interface ParsedCredit {
  scoreRange?: string;
  totalCardLimit?: number;
  totalCardBalance?: number;
  onTimePaymentRate?: number;
  numAccounts?: number;
  hardInquiries?: number;
}

export interface ParseResult {
  data: ParsedCredit;
  foundFields: string[];
  rawTextLength: number;
}

async function extractText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    text += strings + "\n";
  }
  return text;
}

export async function parseCreditReport(file: File): Promise<ParseResult> {
  const rawText = await extractText(file);

  // If there's essentially no text, it's likely a scanned image — no text layer.
  if (rawText.trim().length < 20) {
    throw new Error(
      "This PDF has no readable text (it may be a scanned image). Please enter your details manually."
    );
  }

  const res = await fetch(`${API_BASE}/api/credit/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: rawText }),
  });

  if (!res.ok) {
    throw new Error(`Extraction failed (${res.status}).`);
  }

  const result = await res.json();

  // Normalize: strip nulls so only real fields flow into the form.
  const data: ParsedCredit = {};
  const raw = result.data ?? {};
  if (raw.scoreRange != null) data.scoreRange = raw.scoreRange;
  if (raw.totalCardLimit != null) data.totalCardLimit = raw.totalCardLimit;
  if (raw.totalCardBalance != null) data.totalCardBalance = raw.totalCardBalance;
  if (raw.onTimePaymentRate != null)
    data.onTimePaymentRate = raw.onTimePaymentRate;
  if (raw.numAccounts != null) data.numAccounts = raw.numAccounts;
  if (raw.hardInquiries != null) data.hardInquiries = raw.hardInquiries;

  return {
    data,
    foundFields: result.foundFields ?? [],
    rawTextLength: rawText.length,
  };
}