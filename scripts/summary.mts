// Runs the program against compose and prints the summary.
// Usage: node scripts/summary.mts <sync-id>
import { Effect } from "effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";

import { type Settings, Storage } from "../src/core/contracts.ts";
import { refresh } from "../src/core/program.ts";

const syncId = process.argv[2];
if (!syncId) throw new Error("Usage: node scripts/summary.mts <sync-id>");

const summary = await refresh.pipe(
  Effect.provideService(Storage, {
    loadSettings: Effect.succeed<Settings>({
      serverUrl: "http://localhost:5007",
      apiKey: "spend-bean-dev",
      syncId,
      theme: "system",
    }),
    saveSettings: () => Effect.void,
    saveSummary: () => Effect.void,
    loadSummary: Effect.succeed(null),
  }),
  Effect.provide(FetchHttpClient.layer),
  Effect.runPromise,
);
console.log(JSON.stringify(summary, null, 2));
