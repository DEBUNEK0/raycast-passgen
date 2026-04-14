export type PresetId = "custom" | "strong" | "simple" | "pin";

export type CliErrorCode = "not_found" | "invalid_args" | "empty_output" | "parse_failed" | "unknown";

export interface GeneratePasswordOptions {
  length: number;
  count: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  minLowercase: number;
  minUppercase: number;
  minDigits: number;
  minSymbols: number;
}

export type PresetOptions = Omit<GeneratePasswordOptions, "count">;

export interface ParsedPwgenOutput {
  passwords: string[];
  entropy: number;
  strength: string;
  charsetSize: number | null;
  source: "json" | "text";
}

export interface GeneratedPasswordResult extends ParsedPwgenOutput {
  copiedToClipboard: boolean;
}

export class PwgenCliError extends Error {
  code: CliErrorCode;
  title: string;
  recoverySuggestion?: string;

  constructor(code: CliErrorCode, title: string, message: string, recoverySuggestion?: string) {
    super(message);
    this.name = "PwgenCliError";
    this.code = code;
    this.title = title;
    this.recoverySuggestion = recoverySuggestion;
  }
}
