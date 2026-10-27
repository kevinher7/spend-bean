// oxlint-disable-next-line import/no-unassigned-import
import "expo-router/entry";
import { registerWidgetTaskHandler } from "react-native-android-widget";

import { registerWidgetUpdater } from "./core/widget-updates.ts";
import { updateSpendingWidgets, widgetTaskHandler } from "./widget/handler.tsx";

registerWidgetUpdater(updateSpendingWidgets);
registerWidgetTaskHandler(widgetTaskHandler);
