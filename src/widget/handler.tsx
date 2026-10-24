import { Effect, Layer } from "effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import type { WidgetTaskHandler } from "react-native-android-widget";

import { storageLayer } from "../core/adapters/storage.ts";
import { Storage } from "../core/contracts.ts";
import { refresh } from "../core/program.ts";
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

export const widgetTaskHandler: WidgetTaskHandler = async (props) => {
  const { widgetName, width } = props.widgetInfo;

  if (widgetName === "Add") {
    props.renderWidget(<AddWidget />);
    return;
  }

  if (props.widgetAction === "WIDGET_DELETED") return;
  const { summary, stale } = await loadSpending();
  props.renderWidget(
    <SpendingWidget summary={summary} stale={stale} width={width} />,
  );
};
