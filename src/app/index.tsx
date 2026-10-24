import { Effect, Schema } from "effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as HttpClient from "effect/http/HttpClient";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

// Placeholder until the real screens exist. It checks that an Effect
// HttpClient request works on Hermes with Expo's native fetch.
const Todo = Schema.Struct({ id: Schema.Number, title: Schema.String });

const fetchTodo = Effect.gen(function* () {
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const response = yield* client.get(
    "https://jsonplaceholder.typicode.com/todos/1",
  );
  return yield* Schema.decodeUnknownEffect(Todo)(yield* response.json);
}).pipe(Effect.timeout("10 seconds"), Effect.provide(FetchHttpClient.layer));

export default function Index() {
  const [result, setResult] = useState("Fetching...");

  useEffect(() => {
    Effect.runPromise(fetchTodo).then(
      (todo) => setResult(`OK: ${JSON.stringify(todo)}`),
      (error: unknown) => setResult(`Failed: ${String(error)}`),
    );
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>{result}</Text>
    </View>
  );
}
