import React, {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useMemo,
} from 'react';
import { View, ViewProps } from 'react-native';

/** Shared so tests can assert `fireState` across Rive remounts when props change. */
export const __mockRiveFireState = jest.fn();

export interface RiveRef {
  setInputState: jest.Mock;
  fireState: jest.Mock;
  reset: jest.Mock;
  play: jest.Mock;
  pause: jest.Mock;
  stop: jest.Mock;
  trigger: jest.Mock;
  setNumber: jest.Mock;
  /** Non-null by default: data-bound consumers skip dispatch when it is null. */
  viewTag: jest.Mock;
}

interface MockedMethods {
  setInputState?: jest.Mock;
  fireState?: jest.Mock;
  reset?: jest.Mock;
  play?: jest.Mock;
  pause?: jest.Mock;
  stop?: jest.Mock;
  trigger?: jest.Mock;
  setNumber?: jest.Mock;
  viewTag?: jest.Mock;
}

type MockRiveProps = ViewProps & {
  testID?: string;
  mockedMethods?: MockedMethods;
  source?: string;
  fit?: string;
  alignment?: string;
  autoplay?: boolean;
  stateMachineName?: string;
  onPlay?: () => void;
  onError?: (error: unknown) => void;
};

const DEFAULT_TEST_ID = 'mock-rive-animation';

const createMockedMethods = (overrides?: MockedMethods): RiveRef => ({
  setInputState: jest.fn(),
  fireState: __mockRiveFireState,
  reset: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(),
  trigger: jest.fn(),
  setNumber: jest.fn(),
  viewTag: jest.fn(() => 1),
  ...overrides,
});

let lastMockedMethods: RiveRef | undefined;

const updateLastMockedMethods = (methods: RiveRef) => {
  lastMockedMethods = methods;
};

const RiveMock = forwardRef<RiveRef, MockRiveProps>(
  (
    { testID = DEFAULT_TEST_ID, mockedMethods, onPlay, onError, ...viewProps },
    ref,
  ) => {
    const methods = useMemo(
      () =>
        ({
          ...createMockedMethods(mockedMethods),
          onError,
        }) as RiveRef,
      [mockedMethods, onError],
    );
    updateLastMockedMethods(methods);

    useImperativeHandle(ref, () => methods, [methods]);

    useEffect(() => {
      if (onPlay) {
        onPlay();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <View testID={testID} {...({ onPlay } as ViewProps)} {...viewProps} />
    );
  },
);

RiveMock.displayName = 'RiveMock';

const Fit = {
  Contain: 'contain',
} as const;

const Alignment = {
  Center: 'center',
} as const;

/** Data-binding config; consumers only pass it straight to `<Rive>`. */
export const AutoBind = jest.fn((autoBind: boolean) => ({ autoBind }));

/** Mirrors `RNRiveErrorType` from rive-react-native for module-level error classification. */
export const RNRiveErrorType = {
  FileNotFound: 'FileNotFound',
  UnsupportedRuntimeVersion: 'UnsupportedRuntimeVersion',
  IncorrectRiveFileUrl: 'IncorrectRiveFileUrl',
  IncorrectAnimationName: 'IncorrectAnimationName',
  MalformedFile: 'MalformedFile',
  IncorrectArtboardName: 'IncorrectArtboardName',
  IncorrectStateMachineName: 'IncorrectStateMachineName',
  IncorrectStateMachineInput: 'IncorrectStateMachineInput',
  TextRunNotFoundError: 'TextRunNotFoundError',
  DataBindingError: 'DataBindingError',
  UnusedReferencedAssetError: 'UnusedReferencedAssetError',
} as const;

export const __getLastMockedMethods = (): RiveRef | undefined =>
  lastMockedMethods;

export const __clearLastMockedMethods = (): void => {
  lastMockedMethods = undefined;
};

export const __resetAllMocks = (): void => {
  __mockRiveFireState.mockClear();
  if (lastMockedMethods) {
    Object.entries(lastMockedMethods).forEach(([key, mockFn]) => {
      if (key !== 'fireState' && jest.isMockFunction(mockFn)) {
        mockFn.mockClear();
      }
    });
  }
};

export { Alignment, Fit };
export default RiveMock;
