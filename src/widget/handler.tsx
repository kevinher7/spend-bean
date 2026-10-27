import { Effect, Layer } from "effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import {
  getWidgetInfo,
  requestWidgetUpdateById,
  type WidgetTaskHandler,
} from "react-native-android-widget";

import { loadTheme, storageLayer } from "../core/adapters/storage.ts";
import { type Settings, Storage, type Summary } from "../core/contracts.ts";
import { refresh } from "../core/program.ts";
import { bean, night, paper } from "../core/theme.ts";
import type { WidgetUpdate } from "../core/widget-updates.ts";
import { AddWidget } from "./AddWidget.tsx";
import { SpendingWidget } from "./SpendingWidget.tsx";

const loadCached = Effect.gen(function* () {
  const storage = yield* Storage;
  const configured = yield* storage.loadSettings.pipe(
    Effect.as(true),
    Effect.catchTag("MissingSettings", () => Effect.succeed(false)),
  );
  return {
    summary: configured ? yield* storage.loadSummary : null,
    stale: configured,
  };
});

const loadSpending = refresh.pipe(
  Effect.map((summary) => ({ summary, stale: false })),
  Effect.catchTag("MissingSettings", () =>
    Effect.succeed({ summary: null, stale: false }),
  ),
  Effect.tapCause((cause) =>
    Effect.sync(() => console.warn("refresh failed", String(cause))),
  ),
  Effect.catch(() => loadCached),
  Effect.catch(() => Effect.succeed({ summary: null, stale: true })),
);

const spendingTrees = (
  { summary, stale }: { summary: Summary | null; stale: boolean },
  theme: Settings["theme"],
  widgetName: string,
) => {
  const size = widgetName === "SpendingWide" ? "wide" : "square";
  // The library wires clicks from the light tree, so both must have the same structure.
  return {
    light: (
      <SpendingWidget
        summary={summary}
        stale={stale}
        palette={theme === "bean" ? bean : paper}
        size={size}
      />
    ),
    dark: (
      <SpendingWidget
        summary={summary}
        stale={stale}
        palette={theme === "bean" ? bean : night}
        size={size}
      />
    ),
  };
};

export const updateSpendingWidgets = async (reason: WidgetUpdate) => {
  const widgets = (
    await Promise.all([
      getWidgetInfo("Spending"),
      getWidgetInfo("SpendingWide"),
    ])
  ).flat();
  if (widgets.length === 0) return;
  const [spending, theme] = await Effect.runPromise(
    Effect.all(
      [reason === "connection" ? loadSpending : loadCached, loadTheme],
      { concurrency: "unbounded" },
    ).pipe(Effect.provide(Layer.mergeAll(storageLayer, FetchHttpClient.layer))),
  );
  // The library's bulk update uses an unawaited async forEach. Update by ID to catch rendering failures.
  await Promise.all(
    widgets.map(({ widgetName, widgetId }) =>
      requestWidgetUpdateById({
        widgetName,
        widgetId,
        renderWidget: () => spendingTrees(spending, theme, widgetName),
      }),
    ),
  );
  if (reason === "connection" && spending.stale)
    throw new Error("Spending refresh failed");
};

export const widgetTaskHandler: WidgetTaskHandler = async (props) => {
  const { widgetName } = props.widgetInfo;
  if (props.widgetAction === "WIDGET_DELETED") return;
  if (widgetName === "Add") {
    props.renderWidget(<AddWidget />);
    return;
  }
  const [spending, theme] = await Effect.runPromise(
    Effect.all(
      [
        loadSpending,
        loadTheme.pipe(
          Effect.catch(() => Effect.succeed<Settings["theme"]>("system")),
        ),
      ],
      { concurrency: "unbounded" },
    ).pipe(Effect.provide(Layer.mergeAll(storageLayer, FetchHttpClient.layer))),
  );
  props.renderWidget(spendingTrees(spending, theme, widgetName));
};
