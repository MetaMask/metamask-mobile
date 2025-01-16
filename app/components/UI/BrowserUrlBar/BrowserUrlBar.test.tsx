import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import BrowserUrlBar from './BrowserUrlBar';
import { ConnectionType } from './BrowserUrlBar.types';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { backgroundState } from '../../../util/test/initial-root-state';
import { selectAccountsLength } from '../../../selectors/accountTrackerController';
import { selectNetworkConfigurations } from '../../../selectors/networkController';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn(() => ({
    build: jest.fn(),
  })),
}));

const mockInitialState = {
  engine: {
    backgroundState,
  },
};

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (callback: unknown) => mockUseSelector(callback),
}));

describe('BrowserUrlBar', () => {
  const defaultProps = {
    connectionType: ConnectionType.SECURE,
    onSubmitEditing: jest.fn(),
    onCancel: jest.fn(),
    onFocus: jest.fn(),
    onBlur: jest.fn(),
    onChangeText: jest.fn(),
    connectedAccounts: ['0x123'],
    activeUrl: 'https://example.com',
    setIsUrlBarFocused: jest.fn(),
    isUrlBarFocused: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectAccountsLength) return 1;
      if (selector === selectNetworkConfigurations) return {};
      return null;
    });
  });

  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<BrowserUrlBar {...defaultProps} />, {
      state: mockInitialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });
});
