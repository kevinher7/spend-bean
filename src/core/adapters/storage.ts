import AsyncStorage from "@react-native-async-storage/async-storage";
import { Effect, Layer, Schema } from "effect";
import * as SecureStore from "expo-secure-store";

import {
  MissingSettings,
  type Settings,
  Storage,
  type Summary,
} from "../contracts.ts";

const Spending = Schema.Struct({
  allotted: Schema.Number,
  spent: Schema.Number,
});

const SummarySchema = Schema.Struct({
  date: Schema.String,
  updatedAt: Schema.String,
  daily: Spending,
  weekly: Spending,
  pace: Schema.Number,
});

export const storageLayer = Layer.succeed(Storage, {
  loadSettings: Effect.gen(function* () {
    const [serverUrl, syncId, theme, apiKey] = yield* Effect.tryPromise(() =>
      Promise.all([
        AsyncStorage.getItem("serverUrl"),
        AsyncStorage.getItem("syncId"),
        AsyncStorage.getItem("theme"),
        SecureStore.getItemAsync("apiKey"),
      ]),
    );
    if (serverUrl === null || syncId === null || apiKey === null) {
      return yield* new MissingSettings();
    }
    const settings: Settings = {
      serverUrl,
      syncId,
      apiKey,
      theme: theme === "bean" ? "bean" : "system",
    };
    return settings;
  }),
  saveSettings: (settings) =>
    Effect.tryPromise(() =>
      Promise.all([
        AsyncStorage.setItem("serverUrl", settings.serverUrl),
        AsyncStorage.setItem("syncId", settings.syncId),
        AsyncStorage.setItem("theme", settings.theme),
        SecureStore.setItemAsync("apiKey", settings.apiKey),
      ]),
    ).pipe(Effect.asVoid),
  saveSummary: (summary) =>
    Effect.tryPromise(() =>
      AsyncStorage.setItem("summary", JSON.stringify(summary)),
    ),
  loadSummary: Effect.gen(function* () {
    const json = yield* Effect.tryPromise(() =>
      AsyncStorage.getItem("summary"),
    );
    if (json === null) return null;
    const summary: Summary = yield* Schema.decodeUnknownEffect(SummarySchema)(
      JSON.parse(json),
    );
    return summary;
  }).pipe(Effect.catchTag("SchemaError", () => Effect.succeed(null))),
});
