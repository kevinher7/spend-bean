// Records the actual-http-api GET responses the app uses into tests/fixtures/.
// Usage: node scripts/record-fixtures.mts <sync-id>
import { mkdir, writeFile } from "node:fs/promises";

const syncId = process.argv[2];
if (!syncId)
  throw new Error("Usage: node scripts/record-fixtures.mts <sync-id>");

const baseUrl = `http://localhost:5007/v1/budgets/${syncId}`;
const fixturesDir = new URL("../tests/fixtures/", import.meta.url);

const record = async (file: string, path: string) => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "x-api-key": "spend-bean-dev" },
  });
  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status}`);
  }
  const body = await response.json();
  await writeFile(
    new URL(file, fixturesDir),
    `${JSON.stringify(body, null, 2)}\n`,
  );
  return body;
};

await mkdir(fixturesDir, { recursive: true });

const accounts: { data: { id: string; name: string }[] } = await record(
  "accounts.json",
  "/accounts",
);
await Promise.all([
  record("month-2026-09.json", "/months/2026-09"),
  record("month-2026-10.json", "/months/2026-10"),
  ...accounts.data.map(({ id, name }) =>
    record(
      `transactions-${name.toLowerCase().replaceAll(" ", "-")}.json`,
      `/accounts/${id}/transactions?since_date=2026-09-01`,
    ),
  ),
]);
