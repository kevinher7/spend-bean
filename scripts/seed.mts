// Seeds the compose Actual server with a budget that covers the spending
// rules: two budgeted months, a week across them, a transfer, income and a
// refund. Prints the sync ID the other scripts need.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as actual from "@actual-app/api";

const serverURL = "http://localhost:5006";
const password = "spend-bean";
const budgetName = "Spend Bean Dev";

// Actual stores amounts x100, even for yen.
const yen = (amount: number) => amount * 100;

const bootstrap = await fetch(`${serverURL}/account/bootstrap`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ password }),
});
const bootstrapBody: unknown = await bootstrap.json();
if (
  !bootstrap.ok &&
  !JSON.stringify(bootstrapBody).includes("already-bootstrapped")
) {
  throw new Error(`Bootstrap failed: ${JSON.stringify(bootstrapBody)}`);
}

const dataDir = await mkdtemp(join(tmpdir(), "spend-bean-seed-"));
await actual.init({ dataDir, serverURL, password });

try {
  if ((await actual.getBudgets()).some(({ name }) => name === budgetName)) {
    throw new Error(
      `"${budgetName}" already exists. Reset with: npm run compose:down`,
    );
  }

  await actual.runImport(budgetName, async () => {
    const debit = await actual.createAccount({
      name: "SMBC Debit",
      offbudget: false,
    });
    const cash = await actual.createAccount({ name: "Cash", offbudget: false });
    const savings = await actual.createAccount(
      { name: "Savings", offbudget: true },
      yen(500_000),
    );

    const group = await actual.createCategoryGroup({
      name: "Living",
      is_income: false,
      hidden: false,
    });
    const category = (name: string) =>
      actual.createCategory({ name, group_id: group, hidden: false });
    const food = await category("Food");
    const daily = await category("Daily");
    const transport = await category("Transport");

    const income = (await actual.getCategories()).find(
      ({ is_income }) => is_income,
    );
    if (!income) throw new Error("The new budget has no income category");

    await Promise.all([
      actual.setBudgetAmount("2026-09", food, yen(40_000)),
      actual.setBudgetAmount("2026-09", daily, yen(10_000)),
      actual.setBudgetAmount("2026-09", transport, yen(10_000)),
      actual.setBudgetAmount("2026-10", food, yen(42_000)),
      actual.setBudgetAmount("2026-10", daily, yen(12_000)),
      actual.setBudgetAmount("2026-10", transport, yen(8_000)),
    ]);

    const payees = await actual.getPayees();
    const transferTo = (account: string) => {
      const payee = payees.find(
        ({ transfer_acct }) => transfer_acct === account,
      );
      if (!payee) throw new Error(`No transfer payee for account ${account}`);
      return payee.id;
    };

    // The week of 2026-09-28 to 2026-10-04 spans both months.
    await actual.addTransactions(
      debit,
      [
        {
          date: "2026-09-25",
          amount: yen(300_000),
          payee_name: "Employer",
          category: income.id,
        },
        {
          date: "2026-09-28",
          amount: yen(-1_200),
          payee_name: "Lawson",
          category: food,
        },
        {
          date: "2026-09-30",
          amount: yen(-3_400),
          payee_name: "Matsukiyo",
          category: daily,
        },
        {
          date: "2026-10-01",
          amount: yen(-2_800),
          payee_name: "Seiyu",
          category: food,
        },
        {
          date: "2026-10-02",
          amount: yen(-10_000),
          payee: transferTo(cash),
          notes: "ATM withdrawal",
        },
        {
          date: "2026-10-03",
          amount: yen(-5_000),
          payee_name: "Suica",
          category: transport,
        },
        {
          date: "2026-10-04",
          amount: yen(1_500),
          payee_name: "Seiyu",
          category: food,
          notes: "Refund",
        },
        {
          date: "2026-10-05",
          amount: yen(-20_000),
          payee: transferTo(savings),
          category: daily,
          notes: "To savings",
        },
      ],
      { runTransfers: true },
    );

    await actual.addTransactions(cash, [
      {
        date: "2026-10-02",
        amount: yen(-850),
        payee_name: "Ramen Shop",
        category: food,
      },
    ]);
  });

  const budget = (await actual.getBudgets()).find(
    ({ name }) => name === budgetName,
  );
  console.log(budget?.groupId);
} finally {
  await actual.shutdown();
  await rm(dataDir, { recursive: true, force: true });
}
