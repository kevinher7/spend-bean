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

export const loadTheme = Effect.tryPromise(() =>
  AsyncStorage.getItem("theme"),
).pipe(
  Effect.map((theme): Settings["theme"] =>
    theme === "bean" ? "bean" : "system",
  ),
);

export const saveTheme = (theme: Settings["theme"]) =>
  Effect.tryPromise(() => AsyncStorage.setItem("theme", theme));

export const storageLayer = Layer.succeed(Storage, {
  loadSettings: Effect.gen(function* () {
    const [serverUrl, syncId, budgetName, apiKey] = yield* Effect.tryPromise(
      () =>
        Promise.all([
          AsyncStorage.getItem("serverUrl"),
          AsyncStorage.getItem("syncId"),
          AsyncStorage.getItem("budgetName"),
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
      budgetName: budgetName ?? syncId,
      theme: yield* loadTheme,
    };
    return settings;
  }),
  saveSettings: (settings) =>
    Effect.tryPromise(async () => {
      const [serverUrl, syncId, apiKey] = await Promise.all([
        AsyncStorage.getItem("serverUrl"),
        AsyncStorage.getItem("syncId"),
        SecureStore.getItemAsync("apiKey"),
      ]);
      if (
        serverUrl !== settings.serverUrl ||
        syncId !== settings.syncId ||
        apiKey !== settings.apiKey
      ) {
        await AsyncStorage.removeItem("summary");
      }
      await Promise.all([
        AsyncStorage.setItem("serverUrl", settings.serverUrl),
        AsyncStorage.setItem("syncId", settings.syncId),
        AsyncStorage.setItem(
          "budgetName",
          settings.budgetName ?? settings.syncId,
        ),
        AsyncStorage.setItem("theme", settings.theme),
        SecureStore.setItemAsync("apiKey", settings.apiKey),
      ]);
    }),
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
