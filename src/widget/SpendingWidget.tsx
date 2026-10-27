import { FlexWidget, SvgWidget, TextWidget } from "react-native-android-widget";

import type { Spending, Summary } from "../core/contracts.ts";

const green = "#2E7D32";
const red = "#C62828";
const track = "#E0E0E0";
const ink = "#212121";
const muted = "#757575";

// Material's "refresh" icon. A tap anywhere on the widget refreshes it, the
// icon only makes that visible.
const refreshIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${muted}" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`;

const yen = (amount: number) => `¥${Math.round(amount).toLocaleString("en")}`;

const Bar = ({
  label,
  spending,
  width,
}: {
  label: string;
  spending: Spending;
  width: number;
}) => {
  const over = spending.spent > spending.allotted;
  const ratio =
    spending.allotted === 0 ? 1 : spending.spent / spending.allotted;
  const fillWidth = Math.round(Math.min(1, Math.max(0, ratio)) * width);
  const fits = fillWidth >= 56;

  return (
    <FlexWidget style={{ width, flexDirection: "column", flexGap: 2 }}>
      <FlexWidget
        style={{
          width,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <TextWidget text={label} style={{ fontSize: 13, color: ink }} />
        <TextWidget
          text={yen(spending.allotted)}
          style={{ fontSize: 13, color: ink, fontWeight: "bold" }}
        />
      </FlexWidget>
      <FlexWidget
        style={{
          width,
          height: 22,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: track,
          borderRadius: 11,
          overflow: "hidden",
        }}
      >
        <FlexWidget
          style={{
            width: fillWidth,
            height: 22,
            backgroundColor: over ? red : green,
            borderRadius: 11,
            justifyContent: "flex-end",
            alignItems: "center",
            flexDirection: "row",
            paddingRight: 8,
          }}
        >
          {fits && (
            <TextWidget
              text={yen(spending.spent)}
              style={{ fontSize: 12, color: "#FFFFFF", fontWeight: "bold" }}
            />
          )}
        </FlexWidget>
        {!fits && (
          <TextWidget
            text={yen(spending.spent)}
            style={{ fontSize: 12, color: ink, marginLeft: 6 }}
          />
        )}
      </FlexWidget>
    </FlexWidget>
  );
};

export const SpendingWidget = ({
  summary,
  stale,
  width,
}: {
  summary: Summary | null;
  stale: boolean;
  width: number;
}) => {
  const padding = 12;
  const inner = width - padding * 2;

  return (
    <FlexWidget
      clickAction="REFRESH"
      style={{
        width: "match_parent",
        height: "match_parent",
        flexDirection: "column",
        justifyContent: "center",
        flexGap: 8,
        padding,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
      }}
    >
      {summary === null && (
        <TextWidget
          text={
            stale ? "Could not reach the server" : "Open Spend Bean to set up"
          }
          style={{ fontSize: 14, color: ink }}
        />
      )}
      {summary !== null && (
        <Bar label="Daily" spending={summary.daily} width={inner} />
      )}
      {summary !== null && (
        <Bar label="Weekly" spending={summary.weekly} width={inner} />
      )}
      <FlexWidget
        style={{
          width: inner,
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
          flexGap: 4,
        }}
      >
        {summary !== null && stale && (
          <TextWidget
            text={`updated ${summary.updatedAt.slice(5, 10)} ${summary.updatedAt.slice(11, 16)}`}
            style={{ fontSize: 11, color: muted }}
          />
        )}
        <SvgWidget svg={refreshIcon} style={{ width: 16, height: 16 }} />
      </FlexWidget>
    </FlexWidget>
  );
};
