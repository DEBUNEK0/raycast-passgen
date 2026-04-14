import { ParsedPwgenOutput, PwgenCliError } from "./types";

interface JsonPwgenOutput {
  password?: unknown;
  passwords?: unknown;
  entropy_bits?: unknown;
  strength?: unknown;
  charset_size?: unknown;
}

const CHARSET_SIZE_REGEX = /^Charset size\s*:\s*(\d+)\s+characters$/i;
const ENTROPY_REGEX = /^Entropy\s*:\s*([0-9]+(?:\.[0-9]+)?)\s+bits$/i;
const STRENGTH_REGEX = /^Strength\s*:\s*(.+)$/i;

export function parsePwgenJson(stdout: string): ParsedPwgenOutput {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new PwgenCliError("empty_output", "pwgen returned no data", "The pwgen command completed without any output.");
  }

  let parsed: JsonPwgenOutput;
  try {
    parsed = JSON.parse(trimmed) as JsonPwgenOutput;
  } catch {
    throw new PwgenCliError(
      "parse_failed",
      "Failed to parse pwgen JSON output",
      "The pwgen command returned data that could not be decoded as JSON.",
    );
  }

  const passwords = readPasswords(parsed);
  const entropy = readNumber(parsed.entropy_bits, "entropy_bits");
  const strength = readString(parsed.strength, "strength");
  const charsetSize = parsed.charset_size == null ? null : readInteger(parsed.charset_size, "charset_size");

  return {
    passwords,
    entropy,
    strength,
    charsetSize,
    source: "json",
  };
}

export function parsePwgenText(stdout: string): ParsedPwgenOutput {
  const normalized = stdout.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    throw new PwgenCliError("empty_output", "pwgen returned no data", "The pwgen command completed without any output.");
  }

  const lines = normalized.split("\n");
  const metadataStartIndex = lines.findIndex((line) => isMetadataLine(line.trim()));
  const passwordLines = (metadataStartIndex >= 0 ? lines.slice(0, metadataStartIndex) : lines)
    .map((line) => line.trim())
    .filter(Boolean);

  if (passwordLines.length === 0) {
    throw new PwgenCliError("empty_output", "pwgen returned no passwords", "The pwgen output did not contain any passwords.");
  }

  const metadataLines = (metadataStartIndex >= 0 ? lines.slice(metadataStartIndex) : [])
    .map((line) => line.trim())
    .filter(Boolean);

  let entropy: number | null = null;
  let strength: string | null = null;
  let charsetSize: number | null = null;

  for (const line of metadataLines) {
    const charsetMatch = CHARSET_SIZE_REGEX.exec(line);
    if (charsetMatch) {
      charsetSize = Number.parseInt(charsetMatch[1], 10);
      continue;
    }

    const entropyMatch = ENTROPY_REGEX.exec(line);
    if (entropyMatch) {
      entropy = Number.parseFloat(entropyMatch[1]);
      continue;
    }

    const strengthMatch = STRENGTH_REGEX.exec(line);
    if (strengthMatch) {
      strength = strengthMatch[1].trim();
    }
  }

  if (entropy == null || Number.isNaN(entropy) || !strength) {
    throw new PwgenCliError(
      "parse_failed",
      "Failed to parse pwgen text output",
      "The pwgen command returned text output without the expected entropy and strength metadata.",
    );
  }

  return {
    passwords: passwordLines,
    entropy,
    strength,
    charsetSize,
    source: "text",
  };
}

function readPasswords(parsed: JsonPwgenOutput): string[] {
  if (typeof parsed.password === "string" && parsed.password.length > 0) {
    return [parsed.password];
  }

  if (Array.isArray(parsed.passwords) && parsed.passwords.length > 0 && parsed.passwords.every((value) => typeof value === "string")) {
    return parsed.passwords as string[];
  }

  throw new PwgenCliError(
    "parse_failed",
    "Failed to parse pwgen JSON output",
    "The pwgen JSON output did not include a password or passwords field.",
  );
}

function readNumber(value: unknown, fieldName: string): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  throw new PwgenCliError("parse_failed", "Failed to parse pwgen JSON output", `The ${fieldName} field was missing or invalid.`);
}

function readInteger(value: unknown, fieldName: string): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  throw new PwgenCliError("parse_failed", "Failed to parse pwgen JSON output", `The ${fieldName} field was missing or invalid.`);
}

function readString(value: unknown, fieldName: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  throw new PwgenCliError("parse_failed", "Failed to parse pwgen JSON output", `The ${fieldName} field was missing or invalid.`);
}

function isMetadataLine(line: string): boolean {
  return CHARSET_SIZE_REGEX.test(line) || ENTROPY_REGEX.test(line) || STRENGTH_REGEX.test(line);
}
