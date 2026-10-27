// Widget palettes with Material 3 role names. Hex is defined here because
// core cannot import react-native-android-widget, whose ColorProp accepts it.

export type Hex = `#${string}`;

export type Palette = {
  readonly surface: Hex;
  readonly onSurface: Hex;
  readonly onSurfaceVariant: Hex;
  readonly outlineVariant: Hex;
  readonly primary: Hex;
  readonly error: Hex;
  readonly primaryContainer: Hex;
};

export const paper: Palette = {
  surface: "#ffffff",
  onSurface: "#212121",
  onSurfaceVariant: "#737373",
  outlineVariant: "#ececec",
  primary: "#2E7D32",
  error: "#C62828",
  primaryContainer: "#c9d9ca",
};

export const night: Palette = {
  surface: "#1c1b1f",
  onSurface: "#f2f2f2",
  onSurfaceVariant: "#a4a4a5",
  outlineVariant: "#2f2e33",
  primary: "#81C784",
  error: "#E57373",
  primaryContainer: "#3f5241",
};

export const bean: Palette = {
  surface: "#F4ECE1",
  onSurface: "#3B2A1E",
  onSurfaceVariant: "#8a7462",
  outlineVariant: "#E6D8C6",
  primary: "#7A5230",
  error: "#B5402F",
  primaryContainer: "#cfb99f",
};
