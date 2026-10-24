import { ScrollView, Text, View } from "react-native";
import { WidgetPreview } from "react-native-android-widget";

import type { Summary } from "../core/contracts.ts";
import { AddWidget } from "../widget/AddWidget.tsx";
import { SpendingWidget } from "../widget/SpendingWidget.tsx";

const base: Summary = {
  date: "2026-10-24",
  updatedAt: "2026-10-24T14:32:10.000+09:00",
  daily: { allotted: 3200, spent: 1250 },
  weekly: { allotted: 22400, spent: 9870 },
};

const samples: { title: string; summary: Summary | null; stale: boolean }[] = [
  { title: "Fresh", summary: base, stale: false },
  {
    title: "Over budget",
    summary: {
      ...base,
      daily: { allotted: 0, spent: 4100 },
      weekly: { allotted: 22400, spent: 24900 },
    },
    stale: false,
  },
  {
    title: "Tiny fill",
    summary: { ...base, daily: { allotted: 3200, spent: 80 } },
    stale: false,
  },
  { title: "Stale", summary: base, stale: true },
  { title: "No settings", summary: null, stale: false },
  { title: "Failed, no cache", summary: null, stale: true },
];

export default function Preview() {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12, alignItems: "center" }}
    >
      {samples.map(({ title, summary, stale }) => (
        <View key={title} style={{ gap: 4 }}>
          <Text>{title}</Text>
          <WidgetPreview
            width={320}
            height={160}
            renderWidget={({ width }) => (
              <SpendingWidget summary={summary} stale={stale} width={width} />
            )}
          />
        </View>
      ))}
      <Text style={{ alignSelf: "flex-start" }}>Add</Text>
      <WidgetPreview
        width={72}
        height={72}
        renderWidget={() => <AddWidget />}
      />
    </ScrollView>
  );
}
