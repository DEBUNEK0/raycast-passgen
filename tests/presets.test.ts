import { describe, expect, it } from "vitest";

import { DEFAULT_OPTIONS, PRESET_VALUES, applyPreset, detectPreset } from "../src/lib/presets";

describe("presets", () => {
  it("applies the standard preset", () => {
    const result = applyPreset(
      {
        ...DEFAULT_OPTIONS,
        symbols: true,
      },
      "standard",
    );

    expect(result).toMatchObject(PRESET_VALUES.standard);
    expect(result.count).toBe(DEFAULT_OPTIONS.count);
  });

  it("applies the strong preset", () => {
    const result = applyPreset(DEFAULT_OPTIONS, "strong");

    expect(result).toMatchObject(PRESET_VALUES.strong);
    expect(result.count).toBe(DEFAULT_OPTIONS.count);
  });

  it("detects known preset shapes", () => {
    expect(detectPreset(PRESET_VALUES.standard)).toBe("standard");
    expect(detectPreset(PRESET_VALUES.strong)).toBe("strong");
    expect(detectPreset(PRESET_VALUES.simple)).toBe("simple");
    expect(detectPreset(PRESET_VALUES.pin)).toBe("pin");
  });

  it("marks modified preset values as custom", () => {
    expect(
      detectPreset({
        ...PRESET_VALUES.simple,
        length: PRESET_VALUES.simple.length + 1,
      }),
    ).toBe("custom");
  });
});
