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
