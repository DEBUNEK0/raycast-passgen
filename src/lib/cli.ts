import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { parsePwgenJson, parsePwgenText } from "./parser";
import { GeneratePasswordOptions, ParsedPwgenOutput, PwgenCliError } from "./types";

const execFileAsync = promisify(execFile);

export interface PwgenProcessResult {
  stdout: string;
  stderr: string;
}

export type PwgenExecutor = (args: string[]) => Promise<PwgenProcessResult>;

interface BuildArgsOptions {
  json: boolean;
}

export function buildPwgenArgs(options: GeneratePasswordOptions, buildOptions: BuildArgsOptions = { json: true }): string[] {
  const args = ["-l", String(options.length), "-c", String(options.count)];

  if (!options.lowercase) {
    args.push("--no-lowercase");
  }
  if (!options.uppercase) {
    args.push("--no-uppercase");
  }
  if (!options.digits) {
    args.push("--no-digits");
  }
  if (!options.symbols) {
    args.push("--no-symbols");
  }
  if (options.excludeAmbiguous) {
    args.push("--exclude-ambiguous");
  }

  args.push(
    "--min-lowercase",
    String(options.minLowercase),
    "--min-uppercase",
    String(options.minUppercase),
    "--min-digits",
    String(options.minDigits),
    "--min-symbols",
    String(options.minSymbols),
    "--strength",
  );

  if (buildOptions.json) {
    args.push("--json");
  }

  return args;
}

export async function execPwgen(args: string[]): Promise<PwgenProcessResult> {
  try {
    const result = await execFileAsync("pwgen", args, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    throw toPwgenCliError(error);
  }
}

export async function generatePasswords(
  options: GeneratePasswordOptions,
  executor: PwgenExecutor = execPwgen,
): Promise<ParsedPwgenOutput> {
  const jsonResult = await executor(buildPwgenArgs(options, { json: true }));

  try {
    return parsePwgenJson(jsonResult.stdout);
  } catch (error) {
    if (!(error instanceof PwgenCliError) || error.code !== "parse_failed") {
      throw error;
    }
  }

  const textResult = await executor(buildPwgenArgs(options, { json: false }));
  return parsePwgenText(textResult.stdout);
}

function toPwgenCliError(error: unknown): PwgenCliError {
  if (error instanceof PwgenCliError) {
    return error;
  }

  if (isExecFileError(error)) {
    if (error.code === "ENOENT") {
      return new PwgenCliError(
        "not_found",
        "pwgen was not found",
        "The pwgen executable is not available on your PATH.",
        "Install pwgen and restart Raycast, or update your PATH so Raycast can find it.",
      );
    }

    if (typeof error.code === "number") {
      const rawMessage = error.stderr?.trim() || error.message;
      const sanitizedMessage = sanitizeCliMessage(rawMessage);

      return new PwgenCliError(
        "invalid_args",
        "pwgen rejected the request",
        sanitizedMessage || "pwgen exited with a non-zero status.",
        "Review the selected character classes and minimum constraints, then try again.",
      );
    }
  }

  return new PwgenCliError(
    "unknown",
    "pwgen failed",
    "The pwgen command failed for an unexpected reason.",
    "Try again or verify that pwgen runs correctly in your shell.",
  );
}

function sanitizeCliMessage(message: string): string {
  return message.replace(/^error:\s*/i, "").trim();
}

interface ExecFileError extends Error {
  code?: number | string;
  stderr?: string;
}

function isExecFileError(error: unknown): error is ExecFileError {
  return typeof error === "object" && error !== null && "message" in error;
}
