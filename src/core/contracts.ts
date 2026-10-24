import type { Cause, Effect } from "effect";
import { Context, Data } from "effect";

// Amounts are in whole yen. Dates are YYYY-MM-DD and months YYYY-MM, both in
// Asia/Tokyo.

export type Settings = {
  readonly serverUrl: string;
  readonly apiKey: string;
  readonly syncId: string;
};

export type Account = {
  readonly id: string;
  readonly name: string;
  readonly onBudget: boolean;
  readonly closed: boolean;
};

export type BudgetMonth = {
  readonly month: string;
  readonly budgeted: number;
  readonly incomeCategoryIds: ReadonlyArray<string>;
};

export type Transaction = {
  readonly id: string;
  readonly date: string;
  readonly amount: number;
  readonly categoryId: string | null;
  readonly isTransfer: boolean;
};

export type Spending = {
  readonly allotted: number;
  readonly spent: number;
};

export type Summary = {
  readonly date: string;
  // ISO timestamp with the +09:00 offset.
  readonly updatedAt: string;
  readonly daily: Spending;
  readonly weekly: Spending;
};

export class MissingSettings extends Data.TaggedError("MissingSettings") {}

// The app provides it with AsyncStorage and secure-store, Node scripts with
// their own.
export class Storage extends Context.Service<
  Storage,
  {
    readonly loadSettings: Effect.Effect<
      Settings,
      MissingSettings | Cause.UnknownError
    >;
    readonly saveSettings: (
      settings: Settings,
    ) => Effect.Effect<void, Cause.UnknownError>;
    readonly saveSummary: (
      summary: Summary,
    ) => Effect.Effect<void, Cause.UnknownError>;
    // null until the first successful refresh.
    readonly loadSummary: Effect.Effect<Summary | null, Cause.UnknownError>;
  }
>()("spend-bean/Storage") {}
