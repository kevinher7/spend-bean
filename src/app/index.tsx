import { Effect, Predicate } from "effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { getBudgets } from "../core/adapters/actual.ts";
import {
  loadTheme,
  saveTheme,
  storageLayer,
} from "../core/adapters/storage.ts";
import { type Budget, type Settings, Storage } from "../core/contracts.ts";
import { bean, night, paper } from "../core/theme.ts";
import { updateWidgets } from "../core/widget-updates.ts";

const load = Effect.gen(function* () {
  const storage = yield* Storage;
  return yield* storage.loadSettings;
}).pipe(
  Effect.catchTag("MissingSettings", () => Effect.succeed(null)),
  Effect.provide(storageLayer),
);

export default function Index() {
  const systemScheme = useColorScheme();
  const [serverUrl, setServerUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [theme, setTheme] = useState<Settings["theme"]>("system");
  const [saved, setSaved] = useState<Settings | null>(null);
  const [budgets, setBudgets] = useState<ReadonlyArray<Budget>>([]);
  const [busy, setBusy] = useState<string | null>("Loading settings...");
  const [status, setStatus] = useState({ message: "", error: false });
  const palette =
    theme === "bean" ? bean : systemScheme === "dark" ? night : paper;

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        const [settings, appearance] = await Promise.all([
          Effect.runPromise(load),
          Effect.runPromise(loadTheme),
        ]);
        if (cancelled) return;
        setTheme(appearance);
        setSaved(settings);
        if (settings) {
          setServerUrl(settings.serverUrl);
          setApiKey(settings.apiKey);
        }
      } catch {
        if (!cancelled)
          setStatus({
            message: "Couldn't load settings. Reopen the app to try again.",
            error: true,
          });
      } finally {
        if (!cancelled) setBusy(null);
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveBudget = async (budget: Budget, url: string) => {
    setBusy("Saving settings...");
    setStatus({ message: "", error: false });
    const settings: Settings = {
      serverUrl: url,
      apiKey,
      syncId: budget.syncId,
      budgetName: budget.name,
      theme,
    };
    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const storage = yield* Storage;
          yield* storage.saveSettings(settings);
        }).pipe(Effect.provide(storageLayer)),
      );
    } catch {
      setStatus({
        message: "Couldn't save settings on this device. Try again.",
        error: true,
      });
      return;
    }
    setSaved(settings);
    setBusy("Updating widgets...");
    try {
      await updateWidgets("connection");
      setStatus({ message: `Saved. Using ${budget.name}.`, error: false });
    } catch {
      setStatus({
        message:
          "Settings saved. Widgets couldn't update. Tap a widget to retry.",
        error: true,
      });
    }
  };

  const onConnect = async () => {
    if (busy) return;
    const url = serverUrl.trim().replace(/\/+$/, "");
    try {
      const parsed = new URL(url);
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password ||
        parsed.search ||
        parsed.hash
      )
        throw new Error("Invalid server URL");
    } catch {
      setStatus({
        message:
          "Enter an http:// or https:// server URL without credentials, a query, or a fragment.",
        error: true,
      });
      return;
    }
    if (!apiKey.trim()) {
      setStatus({ message: "Enter your API key.", error: true });
      return;
    }
    setServerUrl(url);
    setBudgets([]);
    setStatus({ message: "", error: false });
    setBusy("Connecting...");
    try {
      const found = await Effect.runPromise(
        getBudgets({ serverUrl: url, apiKey }).pipe(
          Effect.timeout("10 seconds"),
          Effect.provide(FetchHttpClient.layer),
          Effect.match({
            onSuccess: (items) => items,
            onFailure: (error) => {
              let message =
                "Couldn't connect. Check the server URL and API key, then try again.";
              if (Predicate.isTagged(error, "SchemaError")) {
                message =
                  "The server returned an unexpected response. Check that this is the actual-http-api URL.";
              } else if (Predicate.isTagged(error, "TimeoutError")) {
                message =
                  "The server took too long to respond. Check your connection and try again.";
              } else if (
                Predicate.isTagged(error, "HttpClientError") &&
                (error.response?.status === 401 ||
                  error.response?.status === 403)
              ) {
                message =
                  "The server rejected this API key. Check the key and try again.";
              }
              setStatus({ message, error: true });
              return null;
            },
          }),
        ),
      );
      if (found === null) return;
      setBudgets(found);
      const current =
        saved?.serverUrl === url && saved.apiKey === apiKey
          ? found.find((budget) => budget.syncId === saved.syncId)
          : undefined;
      const budget = current ?? (found.length === 1 ? found[0] : undefined);
      if (budget) await saveBudget(budget, url);
      else
        setStatus({
          message:
            found.length === 0
              ? "No synced budgets found on this server."
              : "Connected. Choose a budget to save.",
          error: false,
        });
    } catch {
      setStatus({
        message:
          "Couldn't connect. Check the server URL and API key, then try again.",
        error: true,
      });
    } finally {
      setBusy(null);
    }
  };

  const onTheme = async (picked: Settings["theme"]) => {
    if (busy || picked === theme) return;
    const previous = theme;
    setTheme(picked);
    setBusy("Saving appearance...");
    setStatus({ message: "", error: false });
    try {
      await Effect.runPromise(saveTheme(picked));
    } catch {
      setTheme(previous);
      setStatus({
        message: "Couldn't save appearance on this device. Try again.",
        error: true,
      });
      setBusy(null);
      return;
    }
    try {
      await updateWidgets("appearance");
    } catch {
      setStatus({
        message:
          "Appearance saved. Widgets couldn't update. Tap a widget to retry.",
        error: true,
      });
    } finally {
      setBusy(null);
    }
  };

  const text = { color: palette.onSurface };
  const muted = { color: palette.onSurfaceVariant };
  const field = [styles.field, text, { borderColor: palette.onSurfaceVariant }];

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.screen, { backgroundColor: palette.surface }]}
      >
        <StatusBar
          barStyle={palette === night ? "light-content" : "dark-content"}
        />
        <KeyboardAvoidingView style={styles.screen} behavior="height">
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.heading}>
              <Text style={[styles.eyebrow, muted]}>SPEND BEAN</Text>
              <Text accessibilityRole="header" style={[styles.title, text]}>
                Settings
              </Text>
            </View>
            <View style={styles.section}>
              <Text
                accessibilityRole="header"
                style={[styles.sectionTitle, text]}
              >
                Appearance
              </Text>
              <Text style={[styles.description, muted]}>
                Choose the colors for the app and your widgets.
              </Text>
              <View accessibilityRole="radiogroup" style={styles.choices}>
                {(
                  [
                    {
                      value: "system",
                      label: "System",
                      description: "Paper in light mode, Night in dark mode",
                    },
                    {
                      value: "bean",
                      label: "Bean",
                      description: "Warm paper and coffee brown",
                    },
                  ] as const
                ).map((choice) => (
                  <Pressable
                    key={choice.value}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: theme === choice.value,
                      disabled: busy !== null,
                    }}
                    disabled={busy !== null}
                    onPress={() => {
                      void onTheme(choice.value);
                    }}
                    style={[
                      styles.choice,
                      {
                        borderColor:
                          theme === choice.value
                            ? palette.primary
                            : palette.outlineVariant,
                        backgroundColor:
                          theme === choice.value
                            ? palette.primaryContainer
                            : palette.surface,
                      },
                    ]}
                  >
                    <View
                      style={[styles.radio, { borderColor: palette.primary }]}
                    >
                      {theme === choice.value && (
                        <View
                          style={[
                            styles.radioDot,
                            { backgroundColor: palette.primary },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.choiceText}>
                      <Text style={[styles.choiceTitle, text]}>
                        {choice.label}
                      </Text>
                      <Text style={[styles.description, text]}>
                        {choice.description}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
            <View
              style={[
                styles.section,
                styles.connection,
                { borderColor: palette.outlineVariant },
              ]}
            >
              <Text
                accessibilityRole="header"
                style={[styles.sectionTitle, text]}
              >
                Actual Budget
              </Text>
              <Text style={[styles.description, muted]}>
                Connect to your actual-http-api server.
              </Text>
              <Text nativeID="server-label" style={[styles.label, text]}>
                Server URL
              </Text>
              <TextInput
                accessibilityLabel="Server URL"
                accessibilityLabelledBy="server-label"
                style={field}
                value={serverUrl}
                onChangeText={(value) => {
                  setServerUrl(value);
                  setBudgets([]);
                  setStatus({ message: "", error: false });
                }}
                editable={busy === null}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="https://actual-api.example.com"
                placeholderTextColor={palette.onSurfaceVariant}
                selectionColor={palette.primary}
              />
              <Text nativeID="api-key-label" style={[styles.label, text]}>
                API key
              </Text>
              <TextInput
                accessibilityLabel="API key"
                accessibilityLabelledBy="api-key-label"
                style={field}
                value={apiKey}
                onChangeText={(value) => {
                  setApiKey(value);
                  setBudgets([]);
                  setStatus({ message: "", error: false });
                }}
                editable={busy === null}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                selectionColor={palette.primary}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  disabled: busy !== null,
                  busy: busy !== null,
                }}
                disabled={busy !== null}
                onPress={() => {
                  void onConnect();
                }}
                style={[
                  styles.button,
                  { backgroundColor: palette.primary, opacity: busy ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.buttonText, { color: palette.onPrimary }]}>
                  Connect
                </Text>
              </Pressable>
              {saved && (
                <Text style={[styles.description, muted]}>
                  Saved budget: {saved.budgetName ?? saved.syncId}
                </Text>
              )}
              {budgets.length > 1 && (
                <View accessibilityRole="radiogroup" style={styles.choices}>
                  <Text style={[styles.label, text]}>Choose a budget</Text>
                  {budgets.map((budget) => {
                    const selected =
                      saved?.serverUrl === serverUrl &&
                      saved.apiKey === apiKey &&
                      saved.syncId === budget.syncId;
                    return (
                      <Pressable
                        key={budget.syncId}
                        accessibilityRole="radio"
                        accessibilityState={{
                          checked: selected,
                          disabled: busy !== null,
                        }}
                        disabled={busy !== null}
                        style={[
                          styles.choice,
                          {
                            borderColor: selected
                              ? palette.primary
                              : palette.outlineVariant,
                          },
                        ]}
                        onPress={() => {
                          if (busy) return;
                          void saveBudget(budget, serverUrl).finally(() =>
                            setBusy(null),
                          );
                        }}
                      >
                        <Text style={[styles.choiceTitle, text]}>
                          {selected ? "Selected: " : ""}
                          {budget.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
            {busy && (
              <View style={styles.progress}>
                <ActivityIndicator color={palette.primary} />
                <Text accessibilityLiveRegion="polite" style={muted}>
                  {busy}
                </Text>
              </View>
            )}
            {status.message !== "" && (
              <Text
                accessibilityLiveRegion="polite"
                style={[
                  styles.description,
                  { color: status.error ? palette.error : palette.onSurface },
                ]}
              >
                {status.message}
              </Text>
            )}
            {__DEV__ && (
              <Link href="/preview" style={{ color: palette.primary }}>
                Widget preview
              </Link>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, gap: 24, paddingBottom: 40 },
  heading: { gap: 6, paddingTop: 12 },
  eyebrow: { fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  title: { fontSize: 32, fontWeight: "700" },
  section: { gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: "600" },
  description: { fontSize: 14, lineHeight: 21 },
  choices: { gap: 10 },
  choice: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  choiceText: { flex: 1, gap: 4 },
  choiceTitle: { fontSize: 16, fontWeight: "600" },
  radio: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  connection: { borderTopWidth: 1, paddingTop: 24 },
  label: { fontSize: 14, fontWeight: "600" },
  field: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 52,
    fontSize: 16,
  },
  button: {
    minHeight: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  buttonText: { fontSize: 16, fontWeight: "600" },
  progress: { flexDirection: "row", alignItems: "center", gap: 12 },
});
