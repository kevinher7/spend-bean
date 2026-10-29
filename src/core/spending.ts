import type { BudgetMonth, MonthlySpending, Transaction } from "./contracts.ts";

const daysInMonth = (year: number, month: number) => {
  if (month === 2) {
    const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return isLeap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

const parseDate = (date: string) => ({
  year: Number(date.slice(0, 4)),
  month: Number(date.slice(5, 7)),
  day: Number(date.slice(8, 10)),
});

const addDays = (date: string, days: number) => {
  let { year, month, day } = parseDate(date);
  day += days;
  while (day < 1) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    day += daysInMonth(year, month);
  }
  while (day > daysInMonth(year, month)) {
    day -= daysInMonth(year, month);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

// 0 is Monday. Sakamoto's method, which counts from Sunday.
const weekday = (date: string) => {
  const { year, month, day } = parseDate(date);
  const offsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yearFromMarch = month < 3 ? year - 1 : year;
  const fromSunday =
    (yearFromMarch +
      Math.floor(yearFromMarch / 4) -
      Math.floor(yearFromMarch / 100) +
      Math.floor(yearFromMarch / 400) +
      (offsets[month - 1] ?? 0) +
      day) %
    7;
  return (fromSunday + 6) % 7;
};

export const weekOf = (date: string) => {
  const monday = addDays(date, -weekday(date));
  return { monday, sunday: addDays(monday, 6) };
};

export const weekPace = (date: string) => (weekday(date) + 1) / 7;

export const summarize = (
  today: string,
  months: ReadonlyArray<BudgetMonth>,
  transactions: ReadonlyArray<Transaction>,
) => {
  const { monday, sunday } = weekOf(today);

  const weeklyAllotted = Array.from({ length: 7 }, (_, index) =>
    addDays(monday, index),
  ).reduce((sum, date) => {
    const { year, month } = parseDate(date);
    const budgeted =
      months.find((budgetMonth) => budgetMonth.month === date.slice(0, 7))
        ?.budgeted ?? 0;
    return sum + budgeted / daysInMonth(year, month);
  }, 0);

  const incomeCategoryIds = new Set(
    months.flatMap((month) => month.incomeCategoryIds),
  );
  const spending = transactions.filter(
    (transaction) =>
      !transaction.isTransfer &&
      (transaction.categoryId === null ||
        !incomeCategoryIds.has(transaction.categoryId)),
  );
  // Expenses are negative and refunds positive, so a refund reduces spending.
  // `0 - sum` instead of `-sum` so an empty week is 0, not -0.
  const spentWhere = (predicate: (date: string) => boolean) =>
    0 -
    spending
      .filter((transaction) => predicate(transaction.date))
      .reduce((sum, transaction) => sum + transaction.amount, 0);

  const spentBeforeToday = spentWhere((date) => date >= monday && date < today);
  const daysLeft = 7 - weekday(today);
  const dailyAllotted = Math.max(
    0,
    (weeklyAllotted - spentBeforeToday) / daysLeft,
  );

  const month = months.find(
    (candidate) => candidate.month === today.slice(0, 7),
  );
  const monthlyTransactions = spending.filter(
    (transaction) =>
      transaction.date >= `${today.slice(0, 7)}-01` &&
      transaction.date <= today,
  );
  const spentByCategory = new Map<string | null, number>();
  for (const transaction of monthlyTransactions) {
    spentByCategory.set(
      transaction.categoryId,
      (spentByCategory.get(transaction.categoryId) ?? 0) - transaction.amount,
    );
  }
  const categories = (month?.categories ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    group: category.group,
    allotted: category.budgeted,
    spent: spentByCategory.get(category.id) ?? 0,
  }));
  const categoryIds = new Set(categories.map((category) => category.id));
  const unassigned = monthlyTransactions.filter(
    (transaction) =>
      transaction.categoryId === null ||
      !categoryIds.has(transaction.categoryId),
  );
  if (unassigned.length > 0) {
    categories.push({
      id: "uncategorized",
      name: "Uncategorized",
      group: "Uncategorized",
      allotted: 0,
      spent:
        0 -
        unassigned.reduce((sum, transaction) => sum + transaction.amount, 0),
    });
  }
  const { year, month: monthNumber, day } = parseDate(today);
  const monthly: MonthlySpending = {
    allotted: month?.budgeted ?? 0,
    spent:
      0 -
      monthlyTransactions.reduce(
        (sum, transaction) => sum + transaction.amount,
        0,
      ),
    pace: day / daysInMonth(year, monthNumber),
    categories: categories.filter(
      (category) =>
        category.allotted !== 0 ||
        category.spent !== 0 ||
        spentByCategory.has(category.id),
    ),
  };

  return {
    monthly,
    daily: {
      allotted: Math.round(dailyAllotted),
      spent: spentWhere((date) => date === today),
    },
    weekly: {
      allotted: Math.round(weeklyAllotted),
      spent: spentWhere((date) => date >= monday && date <= sunday),
    },
    pace: weekPace(today),
  };
};
