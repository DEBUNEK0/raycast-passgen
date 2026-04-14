/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** pwgen Executable Path - Optional absolute path to the pwgen executable. Set this when Raycast cannot find pwgen on PATH. */
  "pwgenPath"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `generate` command */
  export type Generate = ExtensionPreferences & {}
  /** Preferences accessible in the `generate-standard` command */
  export type GenerateStandard = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `generate` command */
  export type Generate = {}
  /** Arguments passed to the `generate-standard` command */
  export type GenerateStandard = {}
}

