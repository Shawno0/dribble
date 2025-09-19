Dribble TypeScript Plugin
=========================

This plugin adds IntelliSense for `.dribble` files by transforming them to virtual TS for the TypeScript server.

Key points
- Entry file is `src/index.cts` (CommonJS). Do not use `src/index.ts` here—TS export assignment requires CJS.
- Built output: `dist/index.js` (CommonJS) with source maps.
- The plugin is referenced in example `tsconfig.json` via `compilerOptions.plugins`.
- VS Code uses the workspace TypeScript SDK (set in `.vscode/settings.json`).

Troubleshooting
- If you see `Export assignment cannot be used when targeting ECMAScript modules`, ensure you’re not editing `src/index.ts` (use `src/index.cts`) and the package `type` is `commonjs`.
- Restart the TS server via Command Palette: `TypeScript: Restart TS server`.
- Open TS Server log and search for `[dribble] plugin loaded`.
