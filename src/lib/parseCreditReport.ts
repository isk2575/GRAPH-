import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

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
  foundFields: string[]; // which fields we actually detected
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

// Pull all dollar amounts that follow a given keyword within a window
function sumAfterKeyword(text: string, keyword: RegExp): number | undefined {
  const matches = [
    ...text.matchAll(
      new RegExp(keyword.source + "[^$]{0,40}\\$\\s*([\\d,]+)", "gi")
    ),
  ];
  if (matches.length === 0) return undefined;
  return matches.reduce((sum, m) => sum + Number(m[1].replace(/,/g, "")), 0);
}

function scoreToRange(score: number): string {
  if (score < 580) return "<580";
  if (score < 670) return "580-669";
  if (score < 740) return "670-739";
  if (score < 800) return "740-799";
  return "800+";
}

function detectScore(text: string): string | undefined {
  const contextMatch = text.match(
    /(?:FICO|credit score|score)[^\d]{0,25}(\d{3})/i
  );
  if (contextMatch) {
    const n = Number(contextMatch[1]);
    if (n >= 300 && n <= 850) return scoreToRange(n);
  }
  return undefined;
}

export async function parseCreditReport(file: File): Promise<ParseResult> {
  const rawText = await extractText(file);
  const text = rawText.replace(/\s+/g, " ");

  const data: ParsedCredit = {};
  const foundFields: string[] = [];

  const scoreRange = detectScore(text);
  if (scoreRange) {
    data.scoreRange = scoreRange;
    foundFields.push("scoreRange");
  }

  const limit = sumAfterKeyword(text, /credit limit|high (?:balance|credit)|limit/);
  if (limit) {
    data.totalCardLimit = limit;
    foundFields.push("totalCardLimit");
  }

  const balance = sumAfterKeyword(text, /balance|current balance/);
  if (balance) {
    data.totalCardBalance = balance;
    foundFields.push("totalCardBalance");
  }

  const inquiryMatches = text.match(/hard inquir(?:y|ies)|inquiry/gi);
  if (inquiryMatches) {
    data.hardInquiries = inquiryMatches.length;
    foundFields.push("hardInquiries");
  }

  const accountMatches = text.match(/account number|acct #|account #/gi);
  if (accountMatches) {
    data.numAccounts = accountMatches.length;
    foundFields.push("numAccounts");
  }

  return { data, foundFields, rawTextLength: rawText.length };
}