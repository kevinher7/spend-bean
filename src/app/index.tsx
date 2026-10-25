import { Effect } from "effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Pressable, Text, TextInput, View } from "react-native";

import { getBudgets } from "../core/adapters/actual.ts";
import { storageLayer } from "../core/adapters/storage.ts";
import { type Budget, type Settings, Storage } from "../core/contracts.ts";

const load = Effect.gen(function* () {
  const storage = yield* Storage;
  return yield* storage.loadSettings;
}).pipe(
  Effect.catchTag("MissingSettings", () =>
    Effect.succeed({ serverUrl: "", apiKey: "", syncId: "" }),
  ),
  Effect.provide(storageLayer),
);

const save = (settings: Settings) =>
  Effect.gen(function* () {
    const storage = yield* Storage;
    yield* storage.saveSettings(settings);
  }).pipe(Effect.provide(storageLayer));

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

  const saveBudget = (url: string, budget: Budget) => {
    Effect.runFork(
      save({ serverUrl: url, apiKey, syncId: budget.syncId }).pipe(
        Effect.match({
          onSuccess: () => {
            setSyncId(budget.syncId);
            setStatus(`Saved. Using ${budget.name}.`);
          },
          onFailure: (error) => setStatus(`Failed to save: ${String(error)}`),
        }),
      ),
    );
  };

  const onSave = () => {
    const url = serverUrl.trim().replace(/\/+$/, "");
    setServerUrl(url);
    setStatus("Connecting...");
    Effect.runFork(
      getBudgets({ serverUrl: url, apiKey }).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.match({
          onSuccess: (found) => {
            setBudgets(found);
            const budget =
              found.find((candidate) => candidate.syncId === syncId) ??
              (found.length === 1 ? found[0] : undefined);
            if (budget) saveBudget(url, budget);
            else if (found.length === 0)
              setStatus("The server has no budgets.");
            else setStatus("Pick a budget.");
          },
          onFailure: (error) =>
            setStatus(`Failed to connect: ${String(error)}`),
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
      <Button title="Save" onPress={onSave} />
      {budgets.length > 1 &&
        budgets.map((budget) => (
          <Pressable
            key={budget.syncId}
            style={[
              field,
              budget.syncId === syncId && { borderColor: "#2E7D32" },
            ]}
            onPress={() => saveBudget(serverUrl, budget)}
          >
            <Text>{budget.name}</Text>
          </Pressable>
        ))}
      <Text>{status}</Text>
      {__DEV__ && <Link href="/preview">Widget preview</Link>}
    </View>
  );
}
