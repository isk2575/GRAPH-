import * as pdfjsLib from "pdfjs-dist";
import { apiPost } from "./api";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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

  // No text layer means it's a scanned image — pdf.js can't help, and this
  // would just waste a model call.
  if (rawText.trim().length < 20) {
    throw new Error(
      "This PDF has no readable text (it may be a scanned image). Please enter your details manually."
    );
  }

  const result = await apiPost<{
    data: Record<string, unknown>;
    foundFields: string[];
  }>("/api/credit/extract", { text: rawText });

  // Strip nulls so only fields the model actually found flow into the form.
  const data: ParsedCredit = {};
  const raw = result.data ?? {};
  if (raw.scoreRange != null) data.scoreRange = raw.scoreRange as string;
  if (raw.totalCardLimit != null)
    data.totalCardLimit = raw.totalCardLimit as number;
  if (raw.totalCardBalance != null)
    data.totalCardBalance = raw.totalCardBalance as number;
  if (raw.onTimePaymentRate != null)
    data.onTimePaymentRate = raw.onTimePaymentRate as number;
  if (raw.numAccounts != null) data.numAccounts = raw.numAccounts as number;
  if (raw.hardInquiries != null)
    data.hardInquiries = raw.hardInquiries as number;

  return {
    data,
    foundFields: result.foundFields ?? [],
    rawTextLength: rawText.length,
  };
}