import { Effect, Schema } from "effect";
import * as HttpClient from "effect/http/HttpClient";

import type {
  Account,
  BudgetMonth,
  Settings,
  Transaction,
} from "../contracts.ts";

// Actual stores amounts x100, even for yen.
const toYen = (amount: number) => amount / 100;

const AccountsResponse = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      offbudget: Schema.Boolean,
      closed: Schema.Boolean,
    }),
  ),
});

const BudgetMonthResponse = Schema.Struct({
  data: Schema.Struct({
    month: Schema.String,
    totalBudgeted: Schema.Number,
    categoryGroups: Schema.Array(
      Schema.Struct({
        is_income: Schema.Boolean,
        categories: Schema.Array(Schema.Struct({ id: Schema.String })),
      }),
    ),
  }),
});

const TransactionsResponse = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      date: Schema.String,
      amount: Schema.Number,
      category: Schema.NullOr(Schema.String),
      transfer_id: Schema.NullOr(Schema.String),
    }),
  ),
});

const get = (
  settings: Settings,
  path: string,
  urlParams?: Record<string, string>,
) =>
  Effect.gen(function* () {
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.filterStatusOk,
    );
    const response = yield* client.get(
      `${settings.serverUrl}/v1/budgets/${settings.syncId}${path}`,
      { headers: { "x-api-key": settings.apiKey }, urlParams },
    );
    return yield* response.json;
  });

export const getAccounts = (settings: Settings) =>
  get(settings, "/accounts").pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(AccountsResponse)),
    Effect.map(({ data }) =>
      data.map((account): Account => ({
        id: account.id,
        name: account.name,
        onBudget: !account.offbudget,
        closed: account.closed,
      })),
    ),
  );

export const getBudgetMonth = (settings: Settings, month: string) =>
  get(settings, `/months/${month}`).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(BudgetMonthResponse)),
    Effect.map(({ data }): BudgetMonth => ({
      month: data.month,
      // Actual reports the month's total budgeted as a negative number.
      budgeted: toYen(-data.totalBudgeted),
      incomeCategoryIds: data.categoryGroups
        .filter((group) => group.is_income)
        .flatMap((group) => group.categories.map((category) => category.id)),
    })),
  );

export const getTransactions = (
  settings: Settings,
  accountId: string,
  sinceDate: string,
) =>
  get(settings, `/accounts/${accountId}/transactions`, {
    since_date: sinceDate,
  }).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(TransactionsResponse)),
    Effect.map(({ data }) =>
      data.map((transaction): Transaction => ({
        id: transaction.id,
        date: transaction.date,
        amount: toYen(transaction.amount),
        categoryId: transaction.category,
        isTransfer: transaction.transfer_id !== null,
      })),
    ),
  );
