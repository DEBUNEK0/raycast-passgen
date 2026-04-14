import { describe, expect, it, vi } from "vitest";

import { buildPwgenArgs, generatePasswords, type PwgenExecutor } from "../src/lib/cli";
import { DEFAULT_OPTIONS } from "../src/lib/presets";
import { PwgenCliError } from "../src/lib/types";

describe("buildPwgenArgs", () => {
  it("builds pwgen arguments from options", () => {
    const args = buildPwgenArgs({
      ...DEFAULT_OPTIONS,
      length: 24,
      count: 2,
      symbols: false,
      excludeAmbiguous: true,
      minDigits: 2,
    });

    expect(args).toEqual([
      "-l",
      "24",
      "-c",
      "2",
      "--no-symbols",
      "--exclude-ambiguous",
      "--min-lowercase",
      "0",
      "--min-uppercase",
      "0",
      "--min-digits",
      "2",
      "--min-symbols",
      "0",
      "--strength",
      "--json",
    ]);
  });
});

describe("generatePasswords", () => {
  it("falls back to text output when JSON parsing fails", async () => {
    const executor = vi
      .fn<PwgenExecutor>()
      .mockResolvedValueOnce({ stdout: "{not-json}", stderr: "" })
      .mockResolvedValueOnce({
        stdout: "AAA\n\nCharset size : 1 characters\nEntropy      : 0.0 bits\nStrength     : Weak\n",
        stderr: "",
      });

    const result = await generatePasswords({ ...DEFAULT_OPTIONS, length: 3 }, executor);

    expect(result.source).toBe("text");
    expect(result.passwords).toEqual(["AAA"]);
    expect(executor).toHaveBeenCalledTimes(2);
    expect(executor).toHaveBeenNthCalledWith(1, expect.arrayContaining(["--json"]));
    expect(executor).toHaveBeenNthCalledWith(2, expect.not.arrayContaining(["--json"]));
  });

  it("does not fall back when pwgen returns empty output", async () => {
    const executor = vi.fn<PwgenExecutor>().mockResolvedValueOnce({ stdout: "   ", stderr: "" });

    await expect(generatePasswords({ ...DEFAULT_OPTIONS }, executor)).rejects.toMatchObject({
      code: "empty_output",
    } satisfies Partial<PwgenCliError>);

    expect(executor).toHaveBeenCalledTimes(1);
  });
});
