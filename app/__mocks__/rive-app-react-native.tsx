import React, { useEffect, useMemo, useRef } from 'react';
import { View, ViewProps } from 'react-native';

/**
 * Jest mock for `@rive-app/react-native` (Nitro runtime). Components render as
 * plain Views; hooks return stable, inspectable jest.fn()s. Test helpers are
 * prefixed with `__` — see `docs/readme/animations.md` (Testing).
 */

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

/** Shared so tests can assert `triggerInput` across RiveView remounts. */
export const __mockRiveTriggerInput = jest.fn();

interface RiveViewMethodsMock {
  play: jest.Mock;
  pause: jest.Mock;
  setBooleanInputValue: jest.Mock;
  triggerInput: jest.Mock;
}

const createRiveViewMethods = (): RiveViewMethodsMock => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  setBooleanInputValue: jest.fn(),
  triggerInput: __mockRiveTriggerInput,
});

let lastRiveViewMethods: RiveViewMethodsMock | undefined;
const propertySetters = new Map<string, jest.Mock>();
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

export const __fireRiveTrigger = (path: string): void => {
  triggerCallbacks.get(path)?.forEach((cb) => cb());
};

export const __resetRiveMocks = (): void => {
  __mockRiveTriggerInput.mockClear();
  lastRiveViewMethods = undefined;
  propertySetters.clear();
  triggerCallbacks.clear();
};

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

const MOCK_RIVE_FILE = { __mockRiveFile: true };
const MOCK_VIEW_MODEL_INSTANCE = { __mockViewModelInstance: true };

export const useRiveFile = (_input?: unknown, _options?: unknown) => ({
  riveFile: MOCK_RIVE_FILE,
  isLoading: false,
  error: null,
});

export const useRive = () => {
  const methods = useMemo(() => createRiveViewMethods(), []);
  // Stable ref object across renders, mirroring the real useRive's useRef —
  // call sites listing riveRef in deps must not tear down effects each render.
  const riveRef = useRef(methods);
  const setHybridRef = useMemo(() => ({ f: jest.fn() }), []);
  return {
    riveRef,
    riveViewRef: methods,
    setHybridRef,
  };
};

export const useViewModelInstance = (_source?: unknown, _params?: unknown) => ({
  instance: MOCK_VIEW_MODEL_INSTANCE,
  isLoading: false,
  error: null,
});

const usePropertyMock = <T,>(path: string) => ({
  value: undefined as T | undefined,
  setValue: __getRivePropertySetter(path),
  error: null,
});

export const useRiveString = (path: string, _instance?: unknown) =>
  usePropertyMock<string>(path);
export const useRiveNumber = (path: string, _instance?: unknown) =>
  usePropertyMock<number>(path);
export const useRiveBoolean = (path: string, _instance?: unknown) =>
  usePropertyMock<boolean>(path);

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

  return { trigger: jest.fn(), error: null };
};
