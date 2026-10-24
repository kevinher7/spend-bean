import { DateTime, Effect, Schedule } from "effect";

import {
  getAccounts,
  getBudgetMonth,
  getTransactions,
} from "./adapters/actual.ts";
import { Storage, type Summary } from "./contracts.ts";
import { summarize, weekOf } from "./spending.ts";

const tokyoOffset = 9 * 60 * 60 * 1000;

export const refresh = Effect.gen(function* () {
  const storage = yield* Storage;
  const settings = yield* storage.loadSettings;
  const now = DateTime.setZoneOffset(yield* DateTime.now, tokyoOffset);
  const today = DateTime.formatIsoDate(now);
  const { monday, sunday } = weekOf(today);

  const { months, transactions } = yield* Effect.gen(function* () {
    const accounts = yield* getAccounts(settings);
    return yield* Effect.all(
      {
        months: Effect.forEach(
          new Set([monday.slice(0, 7), sunday.slice(0, 7)]),
          (month) => getBudgetMonth(settings, month),
          { concurrency: "unbounded" },
        ),
        transactions: Effect.forEach(
          accounts.filter((account) => account.onBudget),
          (account) => getTransactions(settings, account.id, monday),
          { concurrency: "unbounded" },
        ),
      },
      { concurrency: "unbounded" },
    );
  }).pipe(
    Effect.timeout("5 seconds"),
    Effect.retry({ times: 2, schedule: Schedule.exponential("500 millis") }),
  );

  const summary: Summary = {
    date: today,
    updatedAt: DateTime.formatIsoOffset(now),
    ...summarize(today, months, transactions.flat()),
  };
  yield* storage.saveSummary(summary);
  return summary;
});
