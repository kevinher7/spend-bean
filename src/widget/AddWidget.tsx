import * as Linking from "expo-linking";
import { FlexWidget, TextWidget } from "react-native-android-widget";

// Static. Opens the app at the new-transaction deep link, which for now is the
// main screen. createURL uses the dev scheme in the dev variant.
export const AddWidget = () => (
  <FlexWidget
    clickAction="OPEN_URI"
    clickActionData={{ uri: Linking.createURL("new-transaction") }}
    style={{
      width: "match_parent",
      height: "match_parent",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#2E7D32",
      borderRadius: 16,
    }}
  >
    <TextWidget
      text="+"
      style={{ fontSize: 36, color: "#FFFFFF", fontWeight: "bold" }}
    />
  </FlexWidget>
);
