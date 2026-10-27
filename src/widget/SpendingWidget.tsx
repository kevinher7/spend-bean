import { FlexWidget, TextWidget } from "react-native-android-widget";

import type { Spending, Summary } from "../core/contracts.ts";
import type { Palette } from "../core/theme.ts";

const yen = (amount: number) => `¥${Math.round(amount).toLocaleString("en")}`;

const isOver = ({ allotted, spent }: Spending) => spent > allotted;

const ratio = ({ allotted, spent }: Spending) =>
  allotted === 0 ? (spent > 0 ? 1 : 0) : spent / allotted;

const Bar = ({
  spending,
  pace,
  height,
  palette,
}: {
  spending: Spending;
  pace: number | null;
  height: number;
  palette: Palette;
}) => {
  const lit = Math.round(Math.min(1, ratio(spending)) * 10);
  const fill = (pace === null ? isOver(spending) : ratio(spending) > pace)
    ? palette.error
    : palette.primary;
  const paceSegments = pace === null ? 0 : Math.round(pace * 10);

  return (
    <FlexWidget style={{ flex: 1, height, flexDirection: "row", flexGap: 3 }}>
      {Array.from({ length: 10 }, (_, index) => (
        <FlexWidget
          key={index}
          style={{
            flex: 1,
            height,
            borderRadius: 4,
            backgroundColor:
              index < lit
                ? fill
                : index < paceSegments
                  ? palette.primaryContainer
                  : palette.outlineVariant,
          }}
        />
      ))}
    </FlexWidget>
  );
};

const Label = ({ text, palette }: { text: string; palette: Palette }) => (
  <TextWidget
    text={text}
    style={{
      fontSize: 10,
      fontWeight: "bold",
      letterSpacing: 1,
      color: palette.onSurfaceVariant,
    }}
  />
);

const Left = ({
  spending,
  fontSize,
  palette,
}: {
  spending: Spending;
  fontSize: number;
  palette: Palette;
}) => (
  <TextWidget
    text={`${isOver(spending) ? "−" : ""}${yen(Math.abs(spending.allotted - spending.spent))}`}
    style={{
      fontSize,
      fontWeight: "bold",
      color: isOver(spending) ? palette.error : palette.onSurface,
    }}
  />
);

const SquareUnit = ({
  label,
  spending,
  pace,
  fontSize,
  height,
  palette,
}: {
  label: string;
  spending: Spending;
  pace: number | null;
  fontSize: number;
  height: number;
  palette: Palette;
}) => (
  <FlexWidget
    style={{ width: "match_parent", flexDirection: "column", flexGap: 6 }}
  >
    <FlexWidget
      style={{
        width: "match_parent",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Label text={label} palette={palette} />
      <Left spending={spending} fontSize={fontSize} palette={palette} />
    </FlexWidget>
    <FlexWidget style={{ width: "match_parent", flexDirection: "row" }}>
      <Bar spending={spending} pace={pace} height={height} palette={palette} />
    </FlexWidget>
  </FlexWidget>
);

const WideRow = ({
  label,
  spending,
  pace,
  palette,
}: {
  label: string;
  spending: Spending;
  pace: number | null;
  palette: Palette;
}) => (
  <FlexWidget
    style={{
      width: "match_parent",
      flexDirection: "row",
      alignItems: "center",
      flexGap: 8,
    }}
  >
    <FlexWidget style={{ width: 42 }}>
      <Label text={label} palette={palette} />
    </FlexWidget>
    <Bar spending={spending} pace={pace} height={12} palette={palette} />
    <FlexWidget
      style={{ width: 72, flexDirection: "row", justifyContent: "flex-end" }}
    >
      <Left spending={spending} fontSize={14} palette={palette} />
    </FlexWidget>
  </FlexWidget>
);

export const SpendingWidget = ({
  summary,
  stale,
  palette,
  size,
}: {
  summary: Summary | null;
  stale: boolean;
  palette: Palette;
  size: "square" | "wide";
}) => (
  <FlexWidget
    clickAction="REFRESH"
    style={{
      width: "match_parent",
      height: "match_parent",
      flexDirection: "column",
      justifyContent: "center",
      backgroundColor: palette.surface,
      borderRadius: 24,
      ...(size === "square"
        ? { flexGap: 12, padding: 14 }
        : { flexGap: 6, paddingHorizontal: 16 }),
    }}
  >
    {summary === null && (
      <TextWidget
        text={
          stale ? "Could not reach the server" : "Open Spend Bean to set up"
        }
        style={{ fontSize: 14, color: palette.onSurface }}
      />
    )}
    {summary !== null && size === "square" && (
      <SquareUnit
        label="TODAY"
        spending={summary.daily}
        pace={null}
        fontSize={18}
        height={16}
        palette={palette}
      />
    )}
    {summary !== null && size === "square" && (
      <SquareUnit
        label="WEEK"
        spending={summary.weekly}
        pace={summary.pace}
        fontSize={14}
        height={10}
        palette={palette}
      />
    )}
    {summary !== null && size === "square" && stale && (
      <TextWidget
        text={`updated ${summary.updatedAt.slice(5, 10)} ${summary.updatedAt.slice(11, 16)}`}
        style={{ fontSize: 10, color: palette.onSurfaceVariant }}
      />
    )}
    {summary !== null && size === "wide" && (
      <WideRow
        label="TODAY"
        spending={summary.daily}
        pace={null}
        palette={palette}
      />
    )}
    {summary !== null && size === "wide" && (
      <WideRow
        label="WEEK"
        spending={summary.weekly}
        pace={summary.pace}
        palette={palette}
      />
    )}
  </FlexWidget>
);
