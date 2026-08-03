// Mock for expo-widgets. The real module's JS entry point calls the
// *throwing* `requireNativeModule('ExpoWidgets')` at import time (see
// app/core/Widgets/createMetaMaskWidget.ios.ts), which crashes under Jest's
// Node environment. Mirrors the public `Widget`/`LiveActivity`/
// `LiveActivityFactory` API shape (node_modules/expo-widgets/src/Widgets.ts)
// so tests can assert on `.updateSnapshot()`, `.reload()`, etc.

export class Widget<T extends object = object> {
  name: string;

  layout: unknown;

  reload = jest.fn();

  updateTimeline = jest.fn();

  updateSnapshot = jest.fn();

  getTimeline = jest.fn().mockResolvedValue([]);

  constructor(name: string, layout: unknown) {
    this.name = name;
    this.layout = layout;
  }
}

export class LiveActivity<T extends object = object> {
  update = jest.fn().mockResolvedValue(undefined);

  end = jest.fn().mockResolvedValue(undefined);

  getPushToken = jest.fn().mockResolvedValue(null);

  addPushTokenListener = jest.fn().mockReturnValue({ remove: jest.fn() });
}

export class LiveActivityFactory<T extends object = object> {
  name: string;

  layout: unknown;

  constructor(name: string, layout: unknown) {
    this.name = name;
    this.layout = layout;
  }

  start = jest.fn().mockImplementation(() => new LiveActivity());

  getInstances = jest.fn().mockReturnValue([]);
}

export const createWidget = jest
  .fn()
  .mockImplementation(
    (name: string, layout: unknown) => new Widget(name, layout),
  );

export const createLiveActivity = jest
  .fn()
  .mockImplementation(
    (name: string, layout: unknown) => new LiveActivityFactory(name, layout),
  );

export const addUserInteractionListener = jest
  .fn()
  .mockReturnValue({ remove: jest.fn() });

export const addPushToStartTokenListener = jest
  .fn()
  .mockReturnValue({ remove: jest.fn() });

export const after = (date: Date) => ({ after: date });
