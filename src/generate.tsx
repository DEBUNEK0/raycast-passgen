import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useState } from "react";

import { generatePasswords } from "./lib/cli";
import { DEFAULT_OPTIONS, applyPreset, detectPreset } from "./lib/presets";
import { GeneratePasswordOptions, GeneratedPasswordResult, PresetId, PresetOptions, PwgenCliError } from "./lib/types";

interface FormValues {
  presetId: PresetId;
  length: string;
  count: string;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  minLowercase: string;
  minUppercase: string;
  minDigits: string;
  minSymbols: string;
  copyAfterGenerate: boolean;
}

interface FormErrors {
  length?: string;
  count?: string;
  minLowercase?: string;
  minUppercase?: string;
  minDigits?: string;
  minSymbols?: string;
}

type ScreenState =
  | {
      kind: "form";
    }
  | {
      kind: "single";
      result: GeneratedPasswordResult;
    }
  | {
      kind: "multiple";
      result: GeneratedPasswordResult;
    }
  | {
      kind: "error";
      error: PwgenCliError;
    };

const DEFAULT_FORM_VALUES: FormValues = {
  presetId: "custom",
  length: String(DEFAULT_OPTIONS.length),
  count: String(DEFAULT_OPTIONS.count),
  lowercase: DEFAULT_OPTIONS.lowercase,
  uppercase: DEFAULT_OPTIONS.uppercase,
  digits: DEFAULT_OPTIONS.digits,
  symbols: DEFAULT_OPTIONS.symbols,
  excludeAmbiguous: DEFAULT_OPTIONS.excludeAmbiguous,
  minLowercase: String(DEFAULT_OPTIONS.minLowercase),
  minUppercase: String(DEFAULT_OPTIONS.minUppercase),
  minDigits: String(DEFAULT_OPTIONS.minDigits),
  minSymbols: String(DEFAULT_OPTIONS.minSymbols),
  copyAfterGenerate: true,
};

export default function Command() {
  const [formValues, setFormValues] = useState<FormValues>(DEFAULT_FORM_VALUES);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [screenState, setScreenState] = useState<ScreenState>({ kind: "form" });
  const [isGenerating, setIsGenerating] = useState(false);
  const preferences = getPreferenceValues<{ pwgenPath?: string }>();

  const canCopyAll = screenState.kind === "single" || screenState.kind === "multiple";

  if (screenState.kind === "single") {
    return (
      <Detail
        navigationTitle="Generated Password"
        markdown={buildSingleDetailMarkdown(screenState.result)}
        actions={
          <ActionPanel>
            <Action title="Copy Password" onAction={() => void copyPasswords([screenState.result.passwords[0]])} />
            <Action title="Regenerate" onAction={() => void handleGenerate()} />
            <Action title="Back to Options" onAction={() => setScreenState({ kind: "form" })} />
            {canCopyAll ? (
              <Action title="Copy All" onAction={() => void copyPasswords(screenState.result.passwords)} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            ) : null}
          </ActionPanel>
        }
      />
    );
  }

  if (screenState.kind === "multiple") {
    const { result } = screenState;
    return (
      <List isShowingDetail navigationTitle="Generated Passwords">
        {result.passwords.map((password, index) => (
          <List.Item
            key={`${index}-${password}`}
            title={password}
            detail={<List.Item.Detail markdown={buildListItemMarkdown(password, index, result)} />}
            actions={
              <ActionPanel>
                <Action title="Copy Password" onAction={() => void copyPasswords([password])} />
                <Action
                  title="Copy All"
                  onAction={() => void copyPasswords(result.passwords)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action title="Regenerate" onAction={() => void handleGenerate()} />
                <Action title="Back to Options" onAction={() => setScreenState({ kind: "form" })} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  if (screenState.kind === "error") {
    return (
      <Detail
        navigationTitle="Generation Error"
        markdown={buildErrorMarkdown(screenState.error)}
        actions={
          <ActionPanel>
            {screenState.error.code === "not_found" ? (
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            ) : null}
            <Action title="Back to Options" onAction={() => setScreenState({ kind: "form" })} />
            <Action title="Try Again" onAction={() => void handleGenerate()} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isGenerating}
      navigationTitle="Generate Password"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Password" onSubmit={() => void handleGenerate()} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="presetId"
        title="Preset"
        value={formValues.presetId}
        onChange={(value) => handlePresetChange(value as PresetId)}
      >
        <Form.Dropdown.Item value="custom" title="Custom" />
        <Form.Dropdown.Item value="strong" title="Strong" />
        <Form.Dropdown.Item value="simple" title="Simple" />
        <Form.Dropdown.Item value="pin" title="PIN" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField
        id="length"
        title="Length"
        value={formValues.length}
        error={formErrors.length}
        onChange={(value) => updateFormValues({ length: value })}
      />
      <Form.TextField
        id="count"
        title="Count"
        value={formValues.count}
        error={formErrors.count}
        onChange={(value) => updateFormValues({ count: value })}
      />
      <Form.Checkbox
        id="copyAfterGenerate"
        label="Copy generated password(s) to clipboard after success"
        value={formValues.copyAfterGenerate}
        onChange={(value) => updateFormValues({ copyAfterGenerate: value }, false)}
      />

      <Form.Separator />

      <Form.Checkbox id="lowercase" label="Include lowercase letters" value={formValues.lowercase} onChange={(value) => updateFormValues({ lowercase: value })} />
      <Form.Checkbox id="uppercase" label="Include uppercase letters" value={formValues.uppercase} onChange={(value) => updateFormValues({ uppercase: value })} />
      <Form.Checkbox id="digits" label="Include digits" value={formValues.digits} onChange={(value) => updateFormValues({ digits: value })} />
      <Form.Checkbox id="symbols" label="Include symbols" value={formValues.symbols} onChange={(value) => updateFormValues({ symbols: value })} />
      <Form.Checkbox
        id="excludeAmbiguous"
        label="Exclude ambiguous characters (0 O 1 l I |)"
        value={formValues.excludeAmbiguous}
        onChange={(value) => updateFormValues({ excludeAmbiguous: value })}
      />

      <Form.Separator />

      <Form.TextField
        id="minLowercase"
        title="Minimum Lowercase"
        value={formValues.minLowercase}
        error={formErrors.minLowercase}
        onChange={(value) => updateFormValues({ minLowercase: value })}
      />
      <Form.TextField
        id="minUppercase"
        title="Minimum Uppercase"
        value={formValues.minUppercase}
        error={formErrors.minUppercase}
        onChange={(value) => updateFormValues({ minUppercase: value })}
      />
      <Form.TextField
        id="minDigits"
        title="Minimum Digits"
        value={formValues.minDigits}
        error={formErrors.minDigits}
        onChange={(value) => updateFormValues({ minDigits: value })}
      />
      <Form.TextField
        id="minSymbols"
        title="Minimum Symbols"
        value={formValues.minSymbols}
        error={formErrors.minSymbols}
        onChange={(value) => updateFormValues({ minSymbols: value })}
      />
    </Form>
  );

  function updateFormValues(patch: Partial<FormValues>, recomputePreset = true) {
    setFormValues((current) => {
      const next = {
        ...current,
        ...patch,
      };

      return recomputePreset ? withDetectedPreset(next) : next;
    });

    setFormErrors((current) => clearPatchedErrors(current, patch));
  }

  function handlePresetChange(presetId: PresetId) {
    if (presetId === "custom") {
      setFormValues((current) => ({
        ...current,
        presetId: "custom",
      }));
      return;
    }

    setFormValues((current) => {
      const nextOptions = applyPreset(toGeneratePasswordOptions(current), presetId);
      return {
        ...fromGeneratePasswordOptions(nextOptions),
        count: current.count,
        copyAfterGenerate: current.copyAfterGenerate,
        presetId,
      };
    });
    setFormErrors({});
  }

  async function handleGenerate() {
    const validation = parseFormValues(formValues);
    if (!validation.ok) {
      setFormErrors(validation.errors);
      await showToast({
        style: Toast.Style.Failure,
        title: "Fix the highlighted fields",
        message: validation.message,
      });
      setScreenState({ kind: "form" });
      return;
    }

    setIsGenerating(true);
    setFormErrors({});
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating password",
      message: "Running pwgen",
    });

    try {
      const parsedResult = await generatePasswords(validation.options, {
        preferredExecutablePath: preferences.pwgenPath,
      });
      const copiedToClipboard = formValues.copyAfterGenerate ? await copyPasswords(parsedResult.passwords, true) : false;
      const result: GeneratedPasswordResult = {
        ...parsedResult,
        copiedToClipboard,
      };

      loadingToast.style = Toast.Style.Success;
      loadingToast.title = copiedToClipboard ? "Generated and copied password" : "Generated password";
      loadingToast.message = `${result.passwords.length} item${result.passwords.length === 1 ? "" : "s"} from pwgen`;

      setScreenState(result.passwords.length === 1 ? { kind: "single", result } : { kind: "multiple", result });
    } catch (error) {
      const pwgenError = normalizeError(error);
      loadingToast.style = Toast.Style.Failure;
      loadingToast.title = pwgenError.title;
      loadingToast.message = pwgenError.message;
      setScreenState({ kind: "error", error: pwgenError });
    } finally {
      setIsGenerating(false);
    }
  }
}

function parseFormValues(formValues: FormValues):
  | { ok: true; options: GeneratePasswordOptions }
  | { ok: false; errors: FormErrors; message: string } {
  const errors: FormErrors = {};

  const length = parseIntegerField("Length", formValues.length, errors, "length", { min: 1 });
  const count = parseIntegerField("Count", formValues.count, errors, "count", { min: 1 });
  const minLowercase = parseIntegerField("Minimum lowercase", formValues.minLowercase, errors, "minLowercase", { min: 0 });
  const minUppercase = parseIntegerField("Minimum uppercase", formValues.minUppercase, errors, "minUppercase", { min: 0 });
  const minDigits = parseIntegerField("Minimum digits", formValues.minDigits, errors, "minDigits", { min: 0 });
  const minSymbols = parseIntegerField("Minimum symbols", formValues.minSymbols, errors, "minSymbols", { min: 0 });

  const hasCharacterClass = formValues.lowercase || formValues.uppercase || formValues.digits || formValues.symbols;
  if (!hasCharacterClass) {
    return {
      ok: false,
      errors,
      message: "Enable at least one character class.",
    };
  }

  if (
    Object.keys(errors).length > 0 ||
    length == null ||
    count == null ||
    minLowercase == null ||
    minUppercase == null ||
    minDigits == null ||
    minSymbols == null
  ) {
    return {
      ok: false,
      errors,
      message: "Enter valid numeric values before generating a password.",
    };
  }

  if (!formValues.lowercase && minLowercase > 0) {
    errors.minLowercase = "Lowercase is disabled.";
  }
  if (!formValues.uppercase && minUppercase > 0) {
    errors.minUppercase = "Uppercase is disabled.";
  }
  if (!formValues.digits && minDigits > 0) {
    errors.minDigits = "Digits are disabled.";
  }
  if (!formValues.symbols && minSymbols > 0) {
    errors.minSymbols = "Symbols are disabled.";
  }

  const minimumTotal = minLowercase + minUppercase + minDigits + minSymbols;
  if (minimumTotal > length) {
    errors.length = "Length must be at least the sum of all minimum constraints.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
      message: "Selected constraints cannot be satisfied.",
    };
  }

  return {
    ok: true,
    options: {
      length,
      count,
      lowercase: formValues.lowercase,
      uppercase: formValues.uppercase,
      digits: formValues.digits,
      symbols: formValues.symbols,
      excludeAmbiguous: formValues.excludeAmbiguous,
      minLowercase,
      minUppercase,
      minDigits,
      minSymbols,
    },
  };
}

function parseIntegerField<K extends keyof FormErrors>(
  label: string,
  value: string,
  errors: FormErrors,
  field: K,
  constraints: { min: number },
): number | null {
  if (!/^\d+$/.test(value)) {
    errors[field] = `${label} must be a whole number.`;
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (parsed < constraints.min) {
    errors[field] = `${label} must be at least ${constraints.min}.`;
    return null;
  }

  return parsed;
}

function fromGeneratePasswordOptions(options: GeneratePasswordOptions): FormValues {
  return {
    presetId: detectPreset(toPresetOptions(options)),
    length: String(options.length),
    count: String(options.count),
    lowercase: options.lowercase,
    uppercase: options.uppercase,
    digits: options.digits,
    symbols: options.symbols,
    excludeAmbiguous: options.excludeAmbiguous,
    minLowercase: String(options.minLowercase),
    minUppercase: String(options.minUppercase),
    minDigits: String(options.minDigits),
    minSymbols: String(options.minSymbols),
    copyAfterGenerate: true,
  };
}

function toGeneratePasswordOptions(formValues: FormValues): GeneratePasswordOptions {
  return {
    length: Number.parseInt(formValues.length, 10) || DEFAULT_OPTIONS.length,
    count: Number.parseInt(formValues.count, 10) || DEFAULT_OPTIONS.count,
    lowercase: formValues.lowercase,
    uppercase: formValues.uppercase,
    digits: formValues.digits,
    symbols: formValues.symbols,
    excludeAmbiguous: formValues.excludeAmbiguous,
    minLowercase: Number.parseInt(formValues.minLowercase, 10) || 0,
    minUppercase: Number.parseInt(formValues.minUppercase, 10) || 0,
    minDigits: Number.parseInt(formValues.minDigits, 10) || 0,
    minSymbols: Number.parseInt(formValues.minSymbols, 10) || 0,
  };
}

function toPresetOptions(options: GeneratePasswordOptions): PresetOptions {
  return {
    length: options.length,
    lowercase: options.lowercase,
    uppercase: options.uppercase,
    digits: options.digits,
    symbols: options.symbols,
    excludeAmbiguous: options.excludeAmbiguous,
    minLowercase: options.minLowercase,
    minUppercase: options.minUppercase,
    minDigits: options.minDigits,
    minSymbols: options.minSymbols,
  };
}

function withDetectedPreset(formValues: FormValues): FormValues {
  const nextPreset = detectPreset({
    length: Number.parseInt(formValues.length, 10) || DEFAULT_OPTIONS.length,
    lowercase: formValues.lowercase,
    uppercase: formValues.uppercase,
    digits: formValues.digits,
    symbols: formValues.symbols,
    excludeAmbiguous: formValues.excludeAmbiguous,
    minLowercase: Number.parseInt(formValues.minLowercase, 10) || 0,
    minUppercase: Number.parseInt(formValues.minUppercase, 10) || 0,
    minDigits: Number.parseInt(formValues.minDigits, 10) || 0,
    minSymbols: Number.parseInt(formValues.minSymbols, 10) || 0,
  });

  return {
    ...formValues,
    presetId: nextPreset,
  };
}

function clearPatchedErrors(current: FormErrors, patch: Partial<FormValues>): FormErrors {
  const next = { ...current };

  if ("length" in patch) {
    delete next.length;
  }
  if ("count" in patch) {
    delete next.count;
  }
  if ("minLowercase" in patch) {
    delete next.minLowercase;
  }
  if ("minUppercase" in patch) {
    delete next.minUppercase;
  }
  if ("minDigits" in patch) {
    delete next.minDigits;
  }
  if ("minSymbols" in patch) {
    delete next.minSymbols;
  }

  return next;
}

async function copyPasswords(passwords: string[], silent = false): Promise<boolean> {
  const content = passwords.join("\n");
  await Clipboard.copy(content);

  if (!silent) {
    await showToast({
      style: Toast.Style.Success,
      title: passwords.length === 1 ? "Copied password" : "Copied passwords",
      message: passwords.length === 1 ? "The password was copied to the clipboard." : "All generated passwords were copied to the clipboard.",
    });
  }

  return true;
}

function normalizeError(error: unknown): PwgenCliError {
  if (error instanceof PwgenCliError) {
    return error;
  }

  if (error instanceof Error) {
    return new PwgenCliError("unknown", "Unexpected error", error.message, "Try again after verifying the pwgen installation.");
  }

  return new PwgenCliError("unknown", "Unexpected error", "An unknown error occurred.", "Try again after verifying the pwgen installation.");
}

function buildSingleDetailMarkdown(result: GeneratedPasswordResult): string {
  return [
    "# Generated Password",
    "",
    toCodeFence(result.passwords[0]),
    "",
    `- Entropy: ${formatEntropy(result.entropy)}`,
    `- Strength: ${result.strength}`,
    `- Source: ${result.source.toUpperCase()}`,
    result.charsetSize == null ? null : `- Character Set Size: ${result.charsetSize}`,
    result.copiedToClipboard ? "- Clipboard: copied after generation" : "- Clipboard: not copied automatically",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildListItemMarkdown(password: string, index: number, result: GeneratedPasswordResult): string {
  return [
    `# Password ${index + 1}`,
    "",
    toCodeFence(password),
    "",
    `- Entropy: ${formatEntropy(result.entropy)}`,
    `- Strength: ${result.strength}`,
    `- Source: ${result.source.toUpperCase()}`,
    result.charsetSize == null ? null : `- Character Set Size: ${result.charsetSize}`,
    result.copiedToClipboard ? "- Clipboard: copied after generation" : "- Clipboard: not copied automatically",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildErrorMarkdown(error: PwgenCliError): string {
  return [
    `# ${error.title}`,
    "",
    error.message,
    "",
    error.recoverySuggestion ? `## Next Step\n\n${error.recoverySuggestion}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatEntropy(value: number): string {
  return `${value.toFixed(1)} bits`;
}

function toCodeFence(value: string): string {
  const longestBacktickRun = getLongestBacktickRun(value);
  const fence = "`".repeat(Math.max(3, longestBacktickRun + 1));
  return `${fence}\n${value}\n${fence}`;
}

function getLongestBacktickRun(value: string): number {
  const matches = value.match(/`+/g);
  if (!matches) {
    return 0;
  }

  return matches.reduce((max, run) => Math.max(max, run.length), 0);
}
