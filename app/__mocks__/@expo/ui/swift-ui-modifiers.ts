// Mock for @expo/ui/swift-ui/modifiers. The real module calls the *throwing*
// `requireNativeModule('ExpoUI')` at import time (see
// node_modules/@expo/ui/src/swift-ui/modifiers/index.ts), which crashes under
// Jest. See ./swift-ui.ts for why the returned modifier functions themselves
// are never actually invoked once a `'widget'`-directive layout function has
// been transformed by babel-preset-expo.
type Modifier = Record<string, unknown>;

const mockModifier =
  (type: string) =>
  (...args: unknown[]): Modifier => ({ $$type: type, args });

export const background = jest.fn(mockModifier('background'));
export const font = jest.fn(mockModifier('font'));
export const foregroundStyle = jest.fn(mockModifier('foregroundStyle'));
export const padding = jest.fn(mockModifier('padding'));
export const cornerRadius = jest.fn(mockModifier('cornerRadius'));
export const frame = jest.fn(mockModifier('frame'));
export const opacity = jest.fn(mockModifier('opacity'));
