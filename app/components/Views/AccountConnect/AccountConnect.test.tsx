import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import AccountConnect from './AccountConnect';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';

const mockedNavigate = jest.fn();
const mockedTrackEvent = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
    }),
  };
});

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockedTrackEvent,
  }),
}));

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

jest.mock('../../../core/Engine', () => ({
  context: {
    PhishingController: {
      maybeUpdateState: jest.fn(),
      test: jest.fn((url: string) => {
        if (url === 'phishing.com') return { result: true };
        return { result: false };
      }),
    },
  },
}));

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('AccountConnect', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <AccountConnect
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            permissionRequestId: 'test',
          },
        }}
      />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
