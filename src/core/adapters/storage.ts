import AsyncStorage from "@react-native-async-storage/async-storage";
import { Effect, Layer } from "effect";
import * as SecureStore from "expo-secure-store";

import { MissingSettings, Storage } from "../contracts.ts";

export const storageLayer = Layer.succeed(Storage, {
  loadSettings: Effect.gen(function* () {
    const [serverUrl, syncId, apiKey] = yield* Effect.tryPromise(() =>
      Promise.all([
        AsyncStorage.getItem("serverUrl"),
        AsyncStorage.getItem("syncId"),
        SecureStore.getItemAsync("apiKey"),
      ]),
    );
    if (serverUrl === null || syncId === null || apiKey === null) {
      return yield* new MissingSettings();
    }
    return { serverUrl, syncId, apiKey };
  }),
  saveSummary: (summary) =>
    Effect.tryPromise(() =>
      AsyncStorage.setItem("summary", JSON.stringify(summary)),
    ),
});
