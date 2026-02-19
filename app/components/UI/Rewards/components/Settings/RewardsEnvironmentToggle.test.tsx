import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RewardsEnvironmentToggle from './RewardsEnvironmentToggle';

// Mock theme
jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      primary: { default: '#0376C9' },
      border: { muted: '#D6D9DC' },
    },
  }),
}));

// Mock design system components
jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    Box: function MockBox({
      children,
      testID,
      twClassName,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      twClassName?: string;
      [key: string]: unknown;
    }) {
      const ReactActual = jest.requireActual('react');
      return ReactActual.createElement(View, { testID, ...props }, children);
    },
    Text: function MockText({
      children,
      variant,
      twClassName,
      ...props
    }: {
      children?: React.ReactNode;
      variant?: string;
      twClassName?: string;
      [key: string]: unknown;
    }) {
      const ReactActual = jest.requireActual('react');
      return ReactActual.createElement(Text, { ...props }, children);
    },
    TextVariant: { HeadingSm: 'HeadingSm', BodyMd: 'BodyMd', BodySm: 'BodySm' },
    BoxFlexDirection: { Row: 'row' },
    BoxAlignItems: { Center: 'center' },
    BoxJustifyContent: { Between: 'space-between' },
  };
});

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'rewards.settings.uat_backend_toggle': 'Use UAT backend',
      'rewards.settings.uat_backend_toggle_description':
        'Switch the Rewards API to target the UAT environment.',
    };
    return translations[key] || key;
  }),
}));

// Mock Engine
const mockCall = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    call: (...args: unknown[]) => mockCall(...args),
  },
}));

const createMockStore = (useUatBackend = false) =>
  configureStore({
    reducer: {
      engine: (
        state = {
          backgroundState: {
            RewardsController: { useUatBackend },
          },
        },
      ) => state,
    },
  });

describe('RewardsEnvironmentToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when METAMASK_ENVIRONMENT is not rc', () => {
    const store = createMockStore();

    // Act
    const { toJSON } = render(
      <Provider store={store}>
        <RewardsEnvironmentToggle />
      </Provider>,
    );

    // Assert
    expect(toJSON()).toBeNull();
  });

  it('exports a valid React component', () => {
    expect(RewardsEnvironmentToggle).toBeDefined();
    expect(typeof RewardsEnvironmentToggle).toBe('function');
  });
});
