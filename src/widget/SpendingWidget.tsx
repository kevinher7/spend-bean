import { FlexWidget, TextWidget } from "react-native-android-widget";

import type { Spending, Summary } from "../core/contracts.ts";

const green = "#2E7D32";
const red = "#C62828";
const track = "#E0E0E0";
const ink = "#212121";

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
      {summary !== null && stale && (
        <TextWidget
          text={`updated ${summary.updatedAt.slice(5, 10)} ${summary.updatedAt.slice(11, 16)}`}
          style={{ fontSize: 11, color: "#757575", textAlign: "right" }}
        />
      )}
    </FlexWidget>
  );
};
