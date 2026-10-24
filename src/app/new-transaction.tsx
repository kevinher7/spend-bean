import { Redirect } from "expo-router";

// The 1x1 widget deep-links here. The add-transaction screen comes after v1,
// so for now it lands on the main screen.
export default function NewTransaction() {
  return <Redirect href="/" />;
}
