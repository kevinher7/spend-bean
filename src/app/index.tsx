import { Effect, Layer } from "effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import { Link, router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { loadTheme, storageLayer } from "../core/adapters/storage.ts";
import {
  type Settings,
  type Spending,
  Storage,
  type Summary,
} from "../core/contracts.ts";
import { refresh } from "../core/program.ts";
import { bean, night, paper, type Palette } from "../core/theme.ts";

const yen = (amount: number) => `¥${Math.round(amount).toLocaleString("en")}`;

function SpendingBar({
  spending,
  pace = 0,
  palette,
}: {
  spending: Spending;
  pace?: number;
  palette: Palette;
}) {
  const ratio =
    spending.allotted <= 0
      ? spending.spent > 0
        ? 1
        : 0
      : spending.spent / spending.allotted;
  const lit = Math.round(Math.max(0, Math.min(1, ratio)) * 10);
  const over = spending.allotted !== 0 && spending.spent > spending.allotted;
  return (
    <View style={styles.bar} accessible={false}>
      {Array.from({ length: 10 }, (_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            {
              backgroundColor:
                index < lit
                  ? over
                    ? palette.error
                    : palette.primary
                  : index < Math.round(pace * 10)
                    ? palette.primaryContainer
                    : palette.outlineVariant,
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function SpendingScreen() {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<Settings["theme"]>("system");
  const [budgetName, setBudgetName] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const pendingRefresh = useRef<AbortController | null>(null);
  const palette =
    theme === "bean" ? bean : systemScheme === "dark" ? night : paper;

  const loadSpending = useCallback(() => {
    pendingRefresh.current?.abort();
    const controller = new AbortController();
    pendingRefresh.current = controller;
    const load = async () => {
      setBusy(true);
      setError("");
      setSummary(null);
      try {
        const [appearance, data] = await Promise.all([
          Effect.runPromise(loadTheme),
          Effect.runPromise(
            Effect.gen(function* () {
              const storage = yield* Storage;
              const settings = yield* storage.loadSettings;
              const cached = yield* storage.loadSummary.pipe(
                Effect.catch(() => Effect.succeed(null)),
              );
              return { settings, cached };
            }).pipe(
              Effect.catchTag("MissingSettings", () => Effect.succeed(null)),
              Effect.provide(storageLayer),
            ),
          ),
        ]);
        if (controller.signal.aborted) return;
        setTheme(appearance);
        if (data === null) {
          router.replace("/settings");
          return;
        }
        setBudgetName(data.settings.budgetName ?? "Actual Budget");
        setSummary(data.cached);
        const updated = await Effect.runPromise(
          refresh.pipe(
            Effect.provide(Layer.mergeAll(storageLayer, FetchHttpClient.layer)),
          ),
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) setSummary(updated);
      } catch {
        if (!controller.signal.aborted)
          setError(
            "Couldn't update spending. Check your connection and try again.",
          );
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    };
    void load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSpending();
      return () => pendingRefresh.current?.abort();
    }, [loadSpending]),
  );

  const monthly = summary?.monthly;
  const left = monthly ? monthly.allotted - monthly.spent : 0;
  const text = { color: palette.onSurface };
  const muted = { color: palette.onSurfaceVariant };
  const groups = [
    ...new Set(monthly?.categories.map((category) => category.group) ?? []),
  ];
  const monthLabel = summary
    ? new Intl.DateTimeFormat("en", {
        month: "long",
        year: "numeric",
        timeZone: "Asia/Tokyo",
      }).format(new Date(`${summary.date}T00:00:00+09:00`))
    : "This month";

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.screen, { backgroundColor: palette.surface }]}
      >
        <StatusBar
          barStyle={palette === night ? "light-content" : "dark-content"}
        />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heading}>
            <Text style={[styles.eyebrow, muted]}>SPEND BEAN</Text>
            <Link
              href="/settings"
              style={[styles.link, { color: palette.primary }]}
            >
              Settings
            </Link>
          </View>
          <View style={styles.section}>
            <Text accessibilityRole="header" style={[styles.title, text]}>
              {monthLabel}
            </Text>
            {budgetName !== "" && (
              <Text style={[styles.body, muted]}>{budgetName}</Text>
            )}
          </View>
          {monthly && (
            <>
              <View style={styles.section}>
                <Text style={[styles.body, muted]}>
                  {monthly.allotted === 0
                    ? "Spent this month"
                    : left < 0
                      ? "Over budget"
                      : "Left this month"}
                </Text>
                <Text
                  style={[
                    styles.amount,
                    {
                      color:
                        monthly.allotted !== 0 && left < 0
                          ? palette.error
                          : palette.onSurface,
                    },
                  ]}
                >
                  {yen(monthly.allotted === 0 ? monthly.spent : Math.abs(left))}
                </Text>
                <Text style={[styles.body, text]}>
                  {yen(monthly.spent)} spent · {yen(monthly.allotted)} budgeted
                </Text>
                {monthly.allotted === 0 ? (
                  <Text style={[styles.body, muted]}>
                    No budget assigned this month.
                  </Text>
                ) : (
                  <>
                    <SpendingBar
                      spending={monthly}
                      pace={monthly.pace}
                      palette={palette}
                    />
                    <Text style={[styles.caption, muted]}>
                      {Math.round(monthly.pace * 100)}% of the month elapsed.
                      Pale segments mark the month's pace.
                    </Text>
                  </>
                )}
                <Text style={[styles.caption, muted]}>
                  Remaining amounts use this month's assigned budget, without
                  carryover.
                </Text>
              </View>
              <View
                style={[
                  styles.section,
                  styles.divider,
                  { borderColor: palette.outlineVariant },
                ]}
              >
                <Text
                  accessibilityRole="header"
                  style={[styles.sectionTitle, text]}
                >
                  Categories
                </Text>
                {groups.length === 0 && (
                  <Text style={[styles.body, muted]}>
                    No category budgets or spending this month.
                  </Text>
                )}
                {groups.map((group) => (
                  <View key={group} style={styles.group}>
                    <Text
                      accessibilityRole="header"
                      style={[styles.groupTitle, muted]}
                    >
                      {group}
                    </Text>
                    {monthly.categories
                      .filter((category) => category.group === group)
                      .map((category) => {
                        const remaining = category.allotted - category.spent;
                        return (
                          <View key={category.id} style={styles.category}>
                            <Text style={[styles.categoryName, text]}>
                              {category.name}
                            </Text>
                            <View style={styles.figures}>
                              <Text style={[styles.body, text]}>
                                {yen(category.spent)} spent
                              </Text>
                              <Text
                                style={[
                                  styles.body,
                                  {
                                    color:
                                      category.allotted !== 0 && remaining < 0
                                        ? palette.error
                                        : palette.onSurface,
                                  },
                                ]}
                              >
                                {category.allotted === 0
                                  ? "No budget assigned"
                                  : `${yen(Math.abs(remaining))} ${remaining < 0 ? "over budget" : "left"}`}
                              </Text>
                            </View>
                            {category.allotted !== 0 && (
                              <SpendingBar
                                spending={category}
                                palette={palette}
                              />
                            )}
                            <Text style={[styles.caption, muted]}>
                              {yen(category.allotted)} budgeted
                            </Text>
                          </View>
                        );
                      })}
                  </View>
                ))}
              </View>
            </>
          )}
          {!monthly && !busy && (
            <Text style={[styles.body, text]}>
              No spending details saved yet. Refresh to load this month.
            </Text>
          )}
          {summary?.monthly && (
            <Text style={[styles.caption, muted]}>
              Updated {summary.updatedAt.slice(0, 10)} at{" "}
              {summary.updatedAt.slice(11, 16)} JST
            </Text>
          )}
          {error !== "" && (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.body, { color: palette.error }]}
            >
              {error}
              {monthly ? " Showing saved spending." : ""}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy, busy }}
            disabled={busy}
            onPress={loadSpending}
            style={[styles.refresh, { borderColor: palette.outlineVariant }]}
          >
            {busy && <ActivityIndicator color={palette.primary} />}
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.body, { color: palette.primary }]}
            >
              {busy ? "Updating spending..." : "Refresh"}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, paddingBottom: 40, gap: 24 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  eyebrow: { fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  link: { fontSize: 16, paddingVertical: 12 },
  title: { fontSize: 32, fontWeight: "700" },
  sectionTitle: { fontSize: 20, fontWeight: "600" },
  section: { gap: 12 },
  amount: { fontSize: 44, fontWeight: "700", fontVariant: ["tabular-nums"] },
  body: { fontSize: 14, lineHeight: 21, fontVariant: ["tabular-nums"] },
  caption: { fontSize: 12, lineHeight: 18 },
  divider: { borderTopWidth: 1, paddingTop: 24 },
  group: { gap: 20, marginTop: 8 },
  groupTitle: { fontSize: 14, fontWeight: "600" },
  category: { gap: 8 },
  categoryName: { fontSize: 18, fontWeight: "600" },
  figures: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  bar: { flexDirection: "row", gap: 3, height: 14 },
  segment: { flex: 1, borderRadius: 4 },
  refresh: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 26,
    padding: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
});
