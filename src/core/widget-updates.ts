export type WidgetUpdate = "appearance" | "connection";

let update: ((reason: WidgetUpdate) => Promise<void>) | undefined;

// The entry point supplies the native implementation, keeping app and widget independent.
export const registerWidgetUpdater = (
  updater: (reason: WidgetUpdate) => Promise<void>,
) => {
  update = updater;
};

export const updateWidgets = (reason: WidgetUpdate): Promise<void> => {
  if (!update)
    return Promise.reject(new Error("Widget updater is not registered"));
  return update(reason);
};
