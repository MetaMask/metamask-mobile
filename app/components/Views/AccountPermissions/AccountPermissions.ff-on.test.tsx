// Mock the networks module before any imports

import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import AccountPermissions from './AccountPermissions';

const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();
const mockedTrackEvent = jest.fn();

// Mock navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
      goBack: mockedGoBack,
      setOptions: jest.fn(),
    }),
  };
});

// Mock safe area context
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

// Mock metrics
jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockedTrackEvent,
  }),
}));

jest.mock('../../../util/networks/index.js', () => ({
  ...jest.requireActual('../../../util/networks/index.js'),
  isMultichainVersion1Enabled: true,
  isChainPermissionsFeatureEnabled: true,
}));

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('AccountPermissions with feature flags ON', () => {
  it('should render AccountPermissions with multichain and chain permissions enabled', () => {
    const { toJSON } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
          },
        }}
      />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot('AccountPermissions-FeatureFlagsOn');
  });
});
