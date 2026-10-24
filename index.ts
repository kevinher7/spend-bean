// Custom entry so the widget task handler is registered next to Expo Router.
// oxlint-disable-next-line import/no-unassigned-import
import "expo-router/entry";
import { registerWidgetTaskHandler } from "react-native-android-widget";

import { widgetTaskHandler } from "./src/widget/handler.tsx";

registerWidgetTaskHandler(widgetTaskHandler);
