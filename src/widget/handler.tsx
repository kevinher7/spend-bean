import { Effect, Layer } from "effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import type { WidgetTaskHandler } from "react-native-android-widget";

import { storageLayer } from "../core/adapters/storage.ts";
import { type Settings, Storage } from "../core/contracts.ts";
import { refresh } from "../core/program.ts";
import { bean, night, paper } from "../core/theme.ts";
import { AddWidget } from "./AddWidget.tsx";
import { SpendingWidget } from "./SpendingWidget.tsx";

const loadSpending = () =>
  refresh.pipe(
    Effect.map((summary) => ({ summary, stale: false })),
    Effect.tapCause((cause) =>
      Effect.sync(() => console.warn("refresh failed", String(cause))),
    ),
    Effect.catch(() =>
      Effect.gen(function* () {
        const storage = yield* Storage;
        return { summary: yield* storage.loadSummary, stale: true };
      }),
    ),
    Effect.catch(() => Effect.succeed({ summary: null, stale: true })),
    Effect.provide(Layer.mergeAll(storageLayer, FetchHttpClient.layer)),
    Effect.runPromise,
  );

const loadTheme = () =>
  Effect.gen(function* () {
    const storage = yield* Storage;
    return (yield* storage.loadSettings).theme;
  }).pipe(
    Effect.catch(() => Effect.succeed<Settings["theme"]>("system")),
    Effect.provide(storageLayer),
    Effect.runPromise,
  );

export const widgetTaskHandler: WidgetTaskHandler = async (props) => {
  const { widgetName } = props.widgetInfo;

  if (widgetName === "Add") {
    props.renderWidget(<AddWidget />);
    return;
  }

  if (props.widgetAction === "WIDGET_DELETED") return;
  const [{ summary, stale }, theme] = await Promise.all([
    loadSpending(),
    loadTheme(),
  ]);
  const size = widgetName === "SpendingWide" ? "wide" : "square";
  // The library wires clicks from the light tree, so both must have the same
  // structure.
  props.renderWidget({
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
  });
};
