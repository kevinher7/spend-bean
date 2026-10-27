import { ScrollView, Text, View } from "react-native";
import { WidgetPreview } from "react-native-android-widget";

import type { Summary } from "../core/contracts.ts";
import { bean, night, paper } from "../core/theme.ts";
import { AddWidget } from "../widget/AddWidget.tsx";
import { SpendingWidget } from "../widget/SpendingWidget.tsx";

// A Wednesday, so the pace is 3/7.
const base: Summary = {
  date: "2026-10-28",
  updatedAt: "2026-10-28T14:32:10.000+09:00",
  daily: { allotted: 3200, spent: 1850 },
  weekly: { allotted: 22400, spent: 9100 },
  pace: 3 / 7,
};

const samples: { title: string; summary: Summary | null; stale: boolean }[] = [
  { title: "On track", summary: base, stale: false },
  {
    title: "Over today",
    summary: {
      ...base,
      daily: { allotted: 3200, spent: 4100 },
      weekly: { allotted: 22400, spent: 13800 },
    },
    stale: false,
  },
  {
    title: "Over the week's pace",
    summary: { ...base, weekly: { allotted: 22400, spent: 12000 } },
    stale: false,
  },
  { title: "Stale", summary: base, stale: true },
  { title: "No settings", summary: null, stale: false },
  { title: "Failed, no cache", summary: null, stale: true },
];

const palettes = [
  { name: "Paper", palette: paper },
  { name: "Night", palette: night },
  { name: "Bean", palette: bean },
];

export default function Preview() {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12, alignItems: "center" }}
    >
      {palettes.flatMap(({ name, palette }) =>
        samples.map(({ title, summary, stale }) => (
          <View key={`${name} ${title}`} style={{ gap: 4 }}>
            <Text>
              {name}, {title}
            </Text>
            <WidgetPreview
              width={160}
              height={160}
              renderWidget={() => (
                <SpendingWidget
                  summary={summary}
                  stale={stale}
                  palette={palette}
                  size="square"
                />
              )}
            />
            <WidgetPreview
              width={320}
              height={80}
              renderWidget={() => (
                <SpendingWidget
                  summary={summary}
                  stale={stale}
                  palette={palette}
                  size="wide"
                />
              )}
            />
          </View>
        )),
      )}
      <Text style={{ alignSelf: "flex-start" }}>Add</Text>
      <WidgetPreview
        width={72}
        height={72}
        renderWidget={() => <AddWidget />}
      />
    </ScrollView>
  );
}
