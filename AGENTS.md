# Spend Bean

The current project is a "widget centered" application that displays the daily and weekly spending progress against the monthly budget defined in Actual Budget. The main motivation behind this is to have a more hands-on way of being aware of the current state of the budget.

The decisions behind the project are tracked in https://github.com/kevinher7/nixos/issues/268.

## Coding Philosophy

For this project, we will take good care of the code, we want to keep implementations easy to understand and compact. Here are some main guidelines

- Simple is king. We do not create abstractions where honest and easy to understand code does the work. A bit of code duplication is preferable over prematurely abstracting in the wrong direction.
- No creating a bunch of functions that are virtually no-ops. They can be safely inlined, even if a bit of duplication does occur.
- No OOP. We do not mess with that. The one exception is Effect's own class-based declarations (services, tagged errors, schemas), since that is how Effect code is written.

## Tech Stack

The project uses React Native (Expo with a development build) to create the Android app (Android-only). Widgets use `react-native-android-widget`. We use Effect for the core code.

- This is Effect 4. Most examples online, and most of what you remember, are Effect 3, and v4 moved and renamed modules. Check the installed package in `node_modules/effect` before using an API from memory.
- Import Effect modules by their own path (`effect/http/FetchHttpClient`), not through a barrel like `effect/http`. Metro does not tree-shake, so the barrel pulls in the server and router code too (about 1.5 MB).

## Structure

```
src/
  core/
    contracts.ts      domain types shared by everything
    spending.ts       spending math, plain functions
    program.ts        the Effect program: settings -> fetch -> compute -> cache
    adapters/
      actual.ts       actual-http-api client: HTTP + Schema decode -> contracts types
      storage.ts      settings and the last good summary
  widget/             widget components + task handler
  app/                Expo Router routes, each file is a screen
```

- `core` runs without React. It never imports `react`, `react-native`, `react-native-android-widget`, `expo-router`, `widget/` or `app/`.
- `widget/` and `app/` only share `core`. They never import each other.
- The two adapters are independent from each other, and `spending.ts` does not use Effect.
- oxlint enforces the import rules above (`.oxlintrc.json`). Do not loosen them to make an import work.

## Domain rules

- Actual stores amounts x100, even for yen. Divide by 100 and show whole yen.
- Weeks run Monday to Sunday.
- Spending is every transaction on on-budget accounts except transfers (`transfer_id` set) and income. Refunds reduce spending.
- Dates are `YYYY-MM-DD` strings in Asia/Tokyo. No `Date` objects in `core`.
- `spending.ts` takes today's date as an input. It never reads the clock.

## Tests

- Do not create tests. I will decide when a test is required.
- Tests follow the golden pattern only: fixtures in, goldens out. Only `core/adapters/actual.ts` and `core/spending.ts` have them. There are no widget or screen tests.
