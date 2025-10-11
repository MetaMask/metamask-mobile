import React, { forwardRef, useImperativeHandle } from 'react';
import { View, ViewProps } from 'react-native';

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
};

const DEFAULT_TEST_ID = 'mock-rive-animation';

const createMockedMethods = (overrides?: MockedMethods): RiveRef => ({
  setInputState: jest.fn(),
  fireState: jest.fn(),
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
  ({ testID = DEFAULT_TEST_ID, mockedMethods, ...viewProps }, ref) => {
    const methods = createMockedMethods(mockedMethods);
    updateLastMockedMethods(methods);

    useImperativeHandle(ref, () => methods, [methods]);

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
  if (lastMockedMethods) {
    Object.values(lastMockedMethods).forEach((mockFn) => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockClear();
      }
    });
  }
};

export { Alignment, Fit };
export default RiveMock;
