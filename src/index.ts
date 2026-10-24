// oxlint-disable-next-line import/no-unassigned-import
import "expo-router/entry";
import { registerWidgetTaskHandler } from "react-native-android-widget";

import { widgetTaskHandler } from "./widget/handler.tsx";

registerWidgetTaskHandler(widgetTaskHandler);
