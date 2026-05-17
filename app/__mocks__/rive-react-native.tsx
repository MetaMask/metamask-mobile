import React, { forwardRef, useImperativeHandle, useEffect } from 'react';
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
}

interface MockedMethods {
  setInputState?: jest.Mock;
  fireState?: jest.Mock;
  reset?: jest.Mock;
  play?: jest.Mock;
  pause?: jest.Mock;
  stop?: jest.Mock;
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
};

const DEFAULT_TEST_ID = 'mock-rive-animation';

const createMockedMethods = (overrides?: MockedMethods): RiveRef => ({
  setInputState: jest.fn(),
  fireState: __mockRiveFireState,
  reset: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  stop: jest.fn(),
  ...overrides,
});

let lastMockedMethods: RiveRef | undefined;

const updateLastMockedMethods = (methods: RiveRef) => {
  lastMockedMethods = methods;
};

const RiveMock = forwardRef<RiveRef, MockRiveProps>(
  ({ testID = DEFAULT_TEST_ID, mockedMethods, onPlay, ...viewProps }, ref) => {
    const methods = createMockedMethods(mockedMethods);
    updateLastMockedMethods(methods);

    useImperativeHandle(ref, () => methods, [methods]);

    useEffect(() => {
      if (onPlay) {
        onPlay();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <View testID={testID} {...viewProps} />;
  },
);

RiveMock.displayName = 'RiveMock';

const Fit = {
  Contain: 'contain',
} as const;

const Alignment = {
  Center: 'center',
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
