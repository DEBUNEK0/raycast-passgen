import { describe, expect, it } from "vitest";

import { parsePwgenJson, parsePwgenText } from "../src/lib/parser";
import { PwgenCliError } from "../src/lib/types";

describe("parsePwgenJson", () => {
  it("parses a single password payload", () => {
    const result = parsePwgenJson(`
      {
        "charset_size": 80,
        "entropy_bits": 82.1,
        "password": "abc123",
        "strength": "Strong"
      }
    `);

    expect(result).toEqual({
      passwords: ["abc123"],
      entropy: 82.1,
      strength: "Strong",
      charsetSize: 80,
      source: "json",
    });
  });

  it("parses a multi-password payload", () => {
    const result = parsePwgenJson(`
      {
        "charset_size": 10,
        "entropy_bits": 19.9,
        "passwords": ["111111", "222222"],
        "strength": "Weak"
      }
    `);

    expect(result.passwords).toEqual(["111111", "222222"]);
    expect(result.source).toBe("json");
  });

  it("raises parse_failed for malformed json", () => {
    expect(() => parsePwgenJson("{not json}")).toThrowError(PwgenCliError);

    try {
      parsePwgenJson("{not json}");
    } catch (error) {
      expect(error).toBeInstanceOf(PwgenCliError);
      expect((error as PwgenCliError).code).toBe("parse_failed");
    }
  });

  it("raises empty_output for blank output", () => {
    expect(() => parsePwgenJson("   ")).toThrowError(PwgenCliError);

    try {
      parsePwgenJson("   ");
    } catch (error) {
      expect((error as PwgenCliError).code).toBe("empty_output");
    }
  });
});

describe("parsePwgenText", () => {
  it("parses a single password response", () => {
    const result = parsePwgenText(`
abc123

Charset size : 80 characters
Entropy      : 82.1 bits
Strength     : Strong
    `);

    expect(result).toEqual({
      passwords: ["abc123"],
      entropy: 82.1,
      strength: "Strong",
      charsetSize: 80,
      source: "text",
    });
  });

  it("parses a multi-password response", () => {
    const result = parsePwgenText(`
111111
222222

Charset size : 10 characters
Entropy      : 19.9 bits
Strength     : Weak
    `);

    expect(result.passwords).toEqual(["111111", "222222"]);
    expect(result.entropy).toBe(19.9);
    expect(result.strength).toBe("Weak");
    expect(result.source).toBe("text");
  });
});
