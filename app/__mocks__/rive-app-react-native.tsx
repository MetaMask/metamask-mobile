import React, { useEffect, useMemo } from 'react';
import { View, ViewProps } from 'react-native';

/**
 * Jest mock for `@rive-app/react-native` (Nitro runtime).
 *
 * Mirrors the package's public API shape (RiveView + hooks + enums) so
 * components render as plain Views and hook consumers get stable,
 * inspectable jest.fn()s.
 *
 * Test helpers (all prefixed with `__`):
 * - `__mockRiveTriggerInput`      shared spy for `riveViewRef.triggerInput`
 * - `__getLastRiveViewMethods()`  methods object of the last mounted view ref
 * - `__getRivePropertySetter(p)`  setter spy registered by useRiveString/Number/Boolean/Enum for path `p`
 * - `__getRivePropertyValueSetter(p)` update the value the hook reports for path `p` (triggers re-render is NOT simulated)
 * - `__fireRiveTrigger(p)`        invoke every `onTrigger` registered via useRiveTrigger for path `p`
 * - `__getRiveTriggerSpy(p)`      the `trigger` fn returned by useRiveTrigger for path `p`
 * - `__resetRiveMocks()`          clear all registries/spies between tests
 */

// ---------------------------------------------------------------------------
// Enums (mirror src/core/Fit.ts, Alignment.ts, Errors.ts, Events.ts)
// ---------------------------------------------------------------------------

export enum Fit {
  Fill,
  Contain,
  Cover,
  FitWidth,
  FitHeight,
  None,
  ScaleDown,
  Layout,
}

export enum Alignment {
  TopLeft = 'topLeft',
  TopCenter = 'topCenter',
  TopRight = 'topRight',
  CenterLeft = 'centerLeft',
  Center = 'center',
  CenterRight = 'centerRight',
  BottomLeft = 'bottomLeft',
  BottomCenter = 'bottomCenter',
  BottomRight = 'bottomRight',
}

export enum RiveErrorType {
  Unknown = 0,
  FileNotFound = 1,
  MalformedFile = 2,
  IncorrectArtboardName = 3,
  IncorrectStateMachineName = 4,
  ViewModelInstanceNotFound = 6,
  IncorrectStateMachineInputName = 8,
}

export interface RiveError {
  message: string;
  type: RiveErrorType;
}

export enum RiveEventType {
  General,
  OpenUrl,
}

export enum DataBindMode {
  Auto,
  None,
}

export class DataBindByName {
  byName: string;
  constructor(name: string) {
    this.byName = name;
  }
}

// ---------------------------------------------------------------------------
// Shared registries
// ---------------------------------------------------------------------------

/** Shared so tests can assert `triggerInput` across RiveView remounts. */
export const __mockRiveTriggerInput = jest.fn();

interface RiveViewMethodsMock {
  awaitViewReady: jest.Mock;
  bindViewModelInstance: jest.Mock;
  getViewModelInstance: jest.Mock;
  play: jest.Mock;
  pause: jest.Mock;
  reset: jest.Mock;
  playIfNeeded: jest.Mock;
  onEventListener: jest.Mock;
  removeEventListeners: jest.Mock;
  setNumberInputValue: jest.Mock;
  getNumberInputValue: jest.Mock;
  setBooleanInputValue: jest.Mock;
  getBooleanInputValue: jest.Mock;
  triggerInput: jest.Mock;
  setTextRunValue: jest.Mock;
  getTextRunValue: jest.Mock;
}

const createRiveViewMethods = (): RiveViewMethodsMock => ({
  awaitViewReady: jest.fn().mockResolvedValue(true),
  bindViewModelInstance: jest.fn(),
  getViewModelInstance: jest.fn(),
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn().mockResolvedValue(undefined),
  playIfNeeded: jest.fn(),
  onEventListener: jest.fn(),
  removeEventListeners: jest.fn(),
  setNumberInputValue: jest.fn(),
  getNumberInputValue: jest.fn().mockReturnValue(0),
  setBooleanInputValue: jest.fn(),
  getBooleanInputValue: jest.fn().mockReturnValue(false),
  triggerInput: __mockRiveTriggerInput,
  setTextRunValue: jest.fn(),
  getTextRunValue: jest.fn().mockReturnValue(''),
});

let lastRiveViewMethods: RiveViewMethodsMock | undefined;
const propertySetters = new Map<string, jest.Mock>();
const propertyValues = new Map<string, unknown>();
const triggerSpies = new Map<string, jest.Mock>();
const triggerCallbacks = new Map<string, Set<() => void>>();

export const __getLastRiveViewMethods = (): RiveViewMethodsMock | undefined =>
  lastRiveViewMethods;

export const __getRivePropertySetter = (path: string): jest.Mock => {
  let setter = propertySetters.get(path);
  if (!setter) {
    setter = jest.fn();
    propertySetters.set(path, setter);
  }
  return setter;
};

export const __getRivePropertyValueSetter =
  (path: string) =>
  (value: unknown): void => {
    propertyValues.set(path, value);
  };

export const __getRiveTriggerSpy = (path: string): jest.Mock => {
  let spy = triggerSpies.get(path);
  if (!spy) {
    spy = jest.fn();
    triggerSpies.set(path, spy);
  }
  return spy;
};

export const __fireRiveTrigger = (path: string): void => {
  triggerCallbacks.get(path)?.forEach((cb) => cb());
};

export const __resetRiveMocks = (): void => {
  __mockRiveTriggerInput.mockClear();
  lastRiveViewMethods = undefined;
  propertySetters.clear();
  propertyValues.clear();
  triggerSpies.clear();
  triggerCallbacks.clear();
};

// ---------------------------------------------------------------------------
// RiveView component
// ---------------------------------------------------------------------------

const DEFAULT_TEST_ID = 'mock-rive-animation';

interface MockRiveViewProps extends ViewProps {
  testID?: string;
  file?: unknown;
  artboardName?: string;
  stateMachineName?: string;
  autoPlay?: boolean;
  fit?: Fit;
  alignment?: Alignment;
  layoutScaleFactor?: number;
  dataBind?: unknown;
  onError?: (error: RiveError) => void;
  hybridRef?: { f: (ref: unknown) => void };
}

export const RiveView = ({
  testID = DEFAULT_TEST_ID,
  hybridRef,
  onError,
  file,
  artboardName,
  stateMachineName,
  autoPlay,
  fit,
  alignment,
  layoutScaleFactor,
  dataBind,
  ...viewProps
}: MockRiveViewProps) => {
  const methods = useMemo(() => createRiveViewMethods(), []);
  lastRiveViewMethods = methods;

  useEffect(() => {
    hybridRef?.f(methods);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methods]);

  return <View testID={testID} {...viewProps} />;
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

const MOCK_RIVE_FILE = { __mockRiveFile: true };
const MOCK_VIEW_MODEL_INSTANCE = { __mockViewModelInstance: true };

export const useRiveFile = (_input?: unknown, _options?: unknown) => ({
  riveFile: MOCK_RIVE_FILE,
  isLoading: false,
  error: null,
});

export const useRive = () => {
  const methods = useMemo(() => createRiveViewMethods(), []);
  const setHybridRef = useMemo(() => ({ f: jest.fn() }), []);
  return {
    riveRef: { current: methods },
    riveViewRef: methods,
    setHybridRef,
  };
};

export const useViewModelInstance = (_source?: unknown, _params?: unknown) => ({
  instance: MOCK_VIEW_MODEL_INSTANCE,
  isLoading: false,
  error: null,
});

const usePropertyMock = <T,>(path: string) => {
  const setValue = __getRivePropertySetter(path);
  return {
    value: propertyValues.get(path) as T | undefined,
    setValue,
    error: null,
  };
};

export const useRiveString = (path: string, _instance?: unknown) =>
  usePropertyMock<string>(path);
export const useRiveNumber = (path: string, _instance?: unknown) =>
  usePropertyMock<number>(path);
export const useRiveBoolean = (path: string, _instance?: unknown) =>
  usePropertyMock<boolean>(path);
export const useRiveEnum = (path: string, _instance?: unknown) =>
  usePropertyMock<string>(path);
export const useRiveColor = (path: string, _instance?: unknown) =>
  usePropertyMock<unknown>(path);

export const useRiveTrigger = (
  path: string,
  _instance?: unknown,
  params?: { onTrigger?: () => void },
) => {
  const onTrigger = params?.onTrigger;
  useEffect(() => {
    if (!onTrigger) return undefined;
    let callbacks = triggerCallbacks.get(path);
    if (!callbacks) {
      callbacks = new Set();
      triggerCallbacks.set(path, callbacks);
    }
    callbacks.add(onTrigger);
    return () => {
      callbacks?.delete(onTrigger);
    };
  }, [path, onTrigger]);

  return { trigger: __getRiveTriggerSpy(path), error: null };
};
