import { GeneratePasswordOptions, PresetId, PresetOptions } from "./types";

export const DEFAULT_OPTIONS: GeneratePasswordOptions = {
  length: 16,
  count: 1,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: false,
  excludeAmbiguous: false,
  minLowercase: 0,
  minUppercase: 0,
  minDigits: 0,
  minSymbols: 0,
};

export const PRESET_VALUES: Record<Exclude<PresetId, "custom">, PresetOptions> = {
  standard: {
    length: 16,
    lowercase: true,
    uppercase: true,
    digits: true,
    symbols: false,
    excludeAmbiguous: false,
    minLowercase: 0,
    minUppercase: 0,
    minDigits: 0,
    minSymbols: 0,
  },
  strong: {
    length: 20,
    lowercase: true,
    uppercase: true,
    digits: true,
    symbols: true,
    excludeAmbiguous: false,
    minLowercase: 1,
    minUppercase: 1,
    minDigits: 1,
    minSymbols: 1,
  },
  simple: {
    length: 12,
    lowercase: true,
    uppercase: true,
    digits: true,
    symbols: false,
    excludeAmbiguous: true,
    minLowercase: 0,
    minUppercase: 0,
    minDigits: 0,
    minSymbols: 0,
  },
  pin: {
    length: 6,
    lowercase: false,
    uppercase: false,
    digits: true,
    symbols: false,
    excludeAmbiguous: false,
    minLowercase: 0,
    minUppercase: 0,
    minDigits: 0,
    minSymbols: 0,
  },
};

const PRESET_IDS = Object.keys(PRESET_VALUES) as Array<Exclude<PresetId, "custom">>;

export function applyPreset(base: GeneratePasswordOptions, presetId: PresetId): GeneratePasswordOptions {
  if (presetId === "custom") {
    return base;
  }

  return {
    ...base,
    ...PRESET_VALUES[presetId],
  };
}

export function detectPreset(options: PresetOptions): PresetId {
  for (const presetId of PRESET_IDS) {
    if (matchesPreset(options, PRESET_VALUES[presetId])) {
      return presetId;
    }
  }

  return "custom";
}

function matchesPreset(left: PresetOptions, right: PresetOptions): boolean {
  return (
    left.length === right.length &&
    left.lowercase === right.lowercase &&
    left.uppercase === right.uppercase &&
    left.digits === right.digits &&
    left.symbols === right.symbols &&
    left.excludeAmbiguous === right.excludeAmbiguous &&
    left.minLowercase === right.minLowercase &&
    left.minUppercase === right.minUppercase &&
    left.minDigits === right.minDigits &&
    left.minSymbols === right.minSymbols
  );
}
