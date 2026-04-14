import { Clipboard, Toast, getPreferenceValues, showHUD, showToast } from "@raycast/api";

import { generatePasswords } from "./lib/cli";
import { DEFAULT_OPTIONS } from "./lib/presets";
import { PwgenCliError } from "./lib/types";

export default async function Command() {
  const preferences = getPreferenceValues<{ pwgenPath?: string }>();

  try {
    const result = await generatePasswords(DEFAULT_OPTIONS, {
      preferredExecutablePath: preferences.pwgenPath,
    });
    const password = result.passwords[0];

    if (!password) {
      throw new PwgenCliError(
        "empty_output",
        "pwgen returned no password",
        "The standard command expected a single password, but pwgen returned no usable value.",
      );
    }

    await Clipboard.copy(password);
    await showHUD(`Standard password copied • ${result.strength}`);
  } catch (error) {
    const pwgenError = normalizeError(error);
    await showToast({
      style: Toast.Style.Failure,
      title: pwgenError.title,
      message: pwgenError.message,
    });
  }
}

function normalizeError(error: unknown): PwgenCliError {
  if (error instanceof PwgenCliError) {
    return error;
  }

  if (error instanceof Error) {
    return new PwgenCliError("unknown", "Standard generation failed", error.message);
  }

  return new PwgenCliError("unknown", "Standard generation failed", "An unknown error occurred.");
}
