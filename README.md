# PWGen Raycast Extension

PWGen is a production-oriented Raycast Extension that delegates all password generation to an existing `pwgen` CLI. The extension does not reimplement password logic in TypeScript. It only collects user input, invokes `pwgen` through `child_process.execFile`, parses the result, and renders a Raycast UI.

## Features

- Generate passwords with the trusted `pwgen` backend.
- Configure length, count, character classes, ambiguous-character exclusion, and minimum per-class constraints.
- Use productized presets:
  - Strong
  - Simple
  - PIN
- Prefer JSON parsing and fall back to text parsing only when JSON decoding fails.
- Display password, entropy, and strength in Raycast.
- Copy the generated password or password batch to the clipboard only when the user explicitly enables it.

## Requirements

- Raycast
- Node.js and npm
- A `pwgen` executable available on `PATH`

## Setup

1. Install project dependencies:

   ```bash
   npm install
   ```

2. Ensure `pwgen` is available on your shell `PATH`.

3. If Raycast still cannot find it, open the extension preferences and set `pwgen Executable Path` explicitly.

4. Start Raycast development mode:

   ```bash
   npm run dev
   ```

## Installing `pwgen`

This extension assumes you already have the exact `pwgen` CLI described by its help surface, including support for:

- `--json`
- `--strength`
- `--exclude-ambiguous`
- `--min-lowercase`
- `--min-uppercase`
- `--min-digits`
- `--min-symbols`

Because the public crate name `pwgen` is ambiguous and may not match this implementation, the safest documented example is to install from the local source that provides the expected CLI:

```bash
cargo install --path /path/to/pwgen
```

If your team distributes the binary another way, make sure the installed executable is named `pwgen` and is discoverable on `PATH` from the Raycast process.

Raycast often runs with a narrower `PATH` than your interactive shell. This extension therefore:

- checks the configured `pwgen Executable Path` preference first
- checks Raycast's current `PATH`
- also probes common install locations such as `~/.cargo/bin/pwgen`, `/opt/homebrew/bin/pwgen`, and `/usr/local/bin/pwgen`

If the binary is still not found, set the absolute path in preferences explicitly.

## Development Commands

- `npm run dev` starts Raycast development mode.
- `npm run build` builds the extension into `dist`.
- `npm run lint` runs Raycast linting.
- `npm run test` runs unit tests for the adapter, parser, and preset logic.

## Security Considerations

- Password generation is always delegated to `pwgen`.
- The extension never logs generated passwords to the console.
- Clipboard writes are explicit. The user must opt in with the form toggle.
- Passwords are displayed in Raycast UI only for the active session and are not intentionally persisted.

## Design Decisions

- `package.json` is the single source of truth for the Raycast manifest.
- The CLI adapter uses `execFile("pwgen", ...)` exclusively.
- JSON parsing is preferred for stability, with a text fallback reserved for successful commands that return invalid JSON.
- The UI is state-driven and separates form entry, result rendering, and error presentation.
