import { Effect, Schema } from "effect";
import * as HttpClient from "effect/http/HttpClient";

import type {
  Account,
  Budget,
  BudgetMonth,
  Settings,
  Transaction,
} from "../contracts.ts";

// Actual stores amounts x100, even for yen.
const toYen = (amount: number) => amount / 100;

const BudgetsResponse = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      // A budget that was never synced has no sync ID.
      groupId: Schema.optionalKey(Schema.String),
      name: Schema.String,
    }),
  ),
});

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
        name: Schema.String,
        is_income: Schema.Boolean,
        categories: Schema.Array(
          Schema.Struct({
            id: Schema.String,
            name: Schema.String,
            budgeted: Schema.optionalKey(Schema.Number),
          }),
        ),
      }),
    ),
  }),
});

const TransactionFields = Schema.Struct({
  id: Schema.String,
  date: Schema.String,
  amount: Schema.Number,
  category: Schema.NullOr(Schema.String),
  transfer_id: Schema.NullOr(Schema.String),
});

const TransactionsResponse = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      ...TransactionFields.fields,
      is_parent: Schema.Boolean,
      subtransactions: Schema.Array(TransactionFields),
    }),
  ),
});

const get = (
  settings: Pick<Settings, "serverUrl" | "apiKey">,
  path: string,
  urlParams?: Record<string, string>,
) =>
  Effect.gen(function* () {
    const client = (yield* HttpClient.HttpClient).pipe(
      HttpClient.filterStatusOk,
    );
    const response = yield* client.get(`${settings.serverUrl}/v1${path}`, {
      headers: { "x-api-key": settings.apiKey },
      urlParams,
    });
    return yield* response.json;
  });

export const getBudgets = (settings: Pick<Settings, "serverUrl" | "apiKey">) =>
  get(settings, "/budgets").pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(BudgetsResponse)),
    Effect.map(({ data }) => {
      // A budget is listed twice once actual-http-api has downloaded it.
      const names = new Map(
        data.flatMap(({ groupId, name }) =>
          groupId === undefined ? [] : [[groupId, name] as const],
        ),
      );
      return [...names].map(([syncId, name]): Budget => ({ syncId, name }));
    }),
  );

export const getAccounts = (settings: Settings) =>
  get(settings, `/budgets/${settings.syncId}/accounts`).pipe(
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
  get(settings, `/budgets/${settings.syncId}/months/${month}`).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(BudgetMonthResponse)),
    Effect.map(({ data }): BudgetMonth => ({
      month: data.month,
      // Actual reports the month's total budgeted as a negative number.
      budgeted: toYen(-data.totalBudgeted),
      incomeCategoryIds: data.categoryGroups
        .filter((group) => group.is_income)
        .flatMap((group) => group.categories.map((category) => category.id)),
      categories: data.categoryGroups
        .filter((group) => !group.is_income)
        .flatMap((group) =>
          group.categories.map((category) => ({
            id: category.id,
            name: category.name,
            group: group.name,
            budgeted: toYen(category.budgeted ?? 0),
          })),
        ),
    })),
  );

export const getTransactions = (
  settings: Settings,
  accountId: string,
  sinceDate: string,
) =>
  get(
    settings,
    `/budgets/${settings.syncId}/accounts/${accountId}/transactions`,
    { since_date: sinceDate },
  ).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(TransactionsResponse)),
    Effect.map(({ data }) =>
      data
        .flatMap((transaction) =>
          transaction.is_parent ? transaction.subtransactions : [transaction],
        )
        .map((transaction): Transaction => ({
          id: transaction.id,
          date: transaction.date,
          amount: toYen(transaction.amount),
          categoryId: transaction.category,
          isTransfer: transaction.transfer_id !== null,
        })),
    ),
  );
