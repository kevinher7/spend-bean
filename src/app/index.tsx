import { Effect, Layer } from "effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Pressable, Text, TextInput, View } from "react-native";

import { getBudgets } from "../core/adapters/actual.ts";
import { storageLayer } from "../core/adapters/storage.ts";
import { type Budget, Storage } from "../core/contracts.ts";

const load = Effect.gen(function* () {
  const storage = yield* Storage;
  return yield* storage.loadSettings;
}).pipe(
  Effect.catchTag("MissingSettings", () =>
    Effect.succeed({ serverUrl: "", apiKey: "", syncId: "" }),
  ),
  Effect.provide(storageLayer),
);

const save = (serverUrl: string, apiKey: string, preferredSyncId: string) =>
  Effect.gen(function* () {
    const budgets = yield* getBudgets({ serverUrl, apiKey });
    const budget =
      budgets.find((candidate) => candidate.syncId === preferredSyncId) ??
      (budgets.length === 1 ? budgets[0] : undefined);
    if (budget) {
      const storage = yield* Storage;
      yield* storage.saveSettings({ serverUrl, apiKey, syncId: budget.syncId });
    }
    return { budgets, budget };
  }).pipe(Effect.provide(Layer.mergeAll(storageLayer, FetchHttpClient.layer)));

export default function Index() {
  const [serverUrl, setServerUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [syncId, setSyncId] = useState("");
  const [budgets, setBudgets] = useState<ReadonlyArray<Budget>>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    Effect.runFork(
      load.pipe(
        Effect.match({
          onSuccess: (settings) => {
            setServerUrl(settings.serverUrl);
            setApiKey(settings.apiKey);
            setSyncId(settings.syncId);
          },
          onFailure: (error) => setStatus(`Failed to load: ${String(error)}`),
        }),
      ),
    );
  }, []);

  const onSave = (preferredSyncId: string) => {
    const url = serverUrl.trim().replace(/\/+$/, "");
    setServerUrl(url);
    setStatus("Connecting...");
    Effect.runFork(
      save(url, apiKey, preferredSyncId).pipe(
        Effect.match({
          onSuccess: ({ budgets: found, budget }) => {
            setBudgets(found);
            if (budget) {
              setSyncId(budget.syncId);
              setStatus(`Saved. Using ${budget.name}.`);
            } else {
              setStatus(
                found.length === 0
                  ? "The server has no budgets."
                  : "Pick a budget.",
              );
            }
          },
          onFailure: (error) => setStatus(`Failed to save: ${String(error)}`),
        }),
      ),
    );
  };

  const field = {
    borderWidth: 1,
    borderColor: "#BDBDBD",
    borderRadius: 6,
    padding: 8,
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: "center" }}>
      <Text>Server URL</Text>
      <TextInput
        style={field}
        value={serverUrl}
        onChangeText={setServerUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://actual-api.example.com"
      />
      <Text>API key</Text>
      <TextInput
        style={field}
        value={apiKey}
        onChangeText={setApiKey}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <Button title="Save" onPress={() => onSave(syncId)} />
      {budgets.length > 1 &&
        budgets.map((budget) => (
          <Pressable
            key={budget.syncId}
            style={[
              field,
              budget.syncId === syncId && { borderColor: "#2E7D32" },
            ]}
            onPress={() => onSave(budget.syncId)}
          >
            <Text>{budget.name}</Text>
          </Pressable>
        ))}
      <Text>{status}</Text>
      {__DEV__ && <Link href="/preview">Widget preview</Link>}
    </View>
  );
}
