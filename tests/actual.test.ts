import { readdir, readFile } from "node:fs/promises";

import { Effect } from "effect";
import { expect, test } from "vitest";

import {
  decodeAccounts,
  decodeBudgetMonth,
  decodeTransactions,
} from "../src/core/adapters/actual";

const fixturesPath = new URL("./fixtures/", import.meta.url);

const decoderFor = (
  fixture: string,
): ((body: unknown) => Effect.Effect<unknown, unknown>) => {
  if (fixture.startsWith("accounts")) return decodeAccounts;
  if (fixture.startsWith("month-")) return decodeBudgetMonth;
  if (fixture.startsWith("transactions-")) return decodeTransactions;
  throw new Error(`No decoder for fixture ${fixture}`);
};

test.for(await readdir(fixturesPath))("%s", async (fixture) => {
  const body: unknown = JSON.parse(
    await readFile(new URL(fixture, fixturesPath), "utf8"),
  );
  const decoded = await Effect.runPromise(decoderFor(fixture)(body));

  await expect(`${JSON.stringify(decoded, null, 2)}\n`).toMatchFileSnapshot(
    `./goldens/${fixture}`,
  );
});
