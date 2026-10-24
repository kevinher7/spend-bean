import { Effect } from "effect";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Text, TextInput, View } from "react-native";

import { storageLayer } from "../core/adapters/storage.ts";
import { type Settings, Storage } from "../core/contracts.ts";

// The widget reads these on its next refresh (a tap or the periodic update).
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

  const onSave = () => {
    Effect.runFork(
      save({ serverUrl, apiKey, syncId }).pipe(
        Effect.match({
          onSuccess: () => setStatus("Saved"),
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
        placeholder="https://actual-api.beanhaven.net"
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
      <Text>Budget sync ID</Text>
      <TextInput
        style={field}
        value={syncId}
        onChangeText={setSyncId}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button title="Save" onPress={onSave} />
      <Text>{status}</Text>
      {__DEV__ && <Link href="/preview">Widget preview</Link>}
    </View>
  );
}
