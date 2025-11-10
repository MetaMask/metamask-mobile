import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockIsEnabled = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());

jest.mock('../../Nav/Main/MainNavigator', () => ({
  lastTrendingScreenRef: { current: 'TrendingFeed' },
  updateLastTrendingScreen: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    addListener: mockAddListener,
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

import TrendingView from './TrendingView';
import { updateLastTrendingScreen } from '../../Nav/Main/MainNavigator';
import { selectChainId } from '../../../selectors/networkController';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
import { selectEnabledNetworksByNamespace } from '../../../selectors/networkEnablementController';
import { useSelector } from 'react-redux';

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    isEnabled: mockIsEnabled,
  }),
}));

jest.mock('../../../util/browser', () => ({
  appendURLParams: jest.fn((url) => ({
    href: `${url}?metamaskEntry=mobile&metricsEnabled=true&marketingEnabled=false`,
  })),
}));

jest.mock('../Browser', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

describe('TrendingView', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEnabled.mockReturnValue(true);
    mockAddListener.mockReturnValue(jest.fn());

    mockUseSelector.mockImplementation((selector) => {
      // Compare selectors by reference for memoized selectors
      if (selector === selectChainId) {
        return '0x1';
      }
      if (selector === selectIsEvmNetworkSelected) {
        return true;
      }
      if (selector === selectEnabledNetworksByNamespace) {
        return {
          eip155: {
            '0x1': true,
          },
        };
      }
      return undefined;
    });
  });

  it('renders browser button in header', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <TrendingView />
      </NavigationContainer>,
    );

    const browserButton = getByTestId('trending-view-browser-button');

    expect(browserButton).toBeDefined();
  });

  it('renders title in header', () => {
    const { getByText } = render(
      <NavigationContainer>
        <TrendingView />
      </NavigationContainer>,
    );

    expect(getByText('Trending')).toBeDefined();
  });

  it('navigates to TrendingBrowser route when browser button is pressed', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <TrendingView />
      </NavigationContainer>,
    );

    const browserButton = getByTestId('trending-view-browser-button');

    fireEvent.press(browserButton);

    expect(mockNavigate).toHaveBeenCalledWith('TrendingBrowser', {
      newTabUrl: expect.stringContaining('?metamaskEntry=mobile'),
      timestamp: expect.any(Number),
      fromTrending: true,
    });
    expect(updateLastTrendingScreen).toHaveBeenCalledWith('TrendingBrowser');
  });

  it('includes portfolio URL with correct parameters when browser button is pressed', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <TrendingView />
      </NavigationContainer>,
    );

    const browserButton = getByTestId('trending-view-browser-button');

    fireEvent.press(browserButton);

    expect(mockNavigate).toHaveBeenCalledWith(
      'TrendingBrowser',
      expect.objectContaining({
        newTabUrl: expect.stringContaining('metamaskEntry=mobile'),
        fromTrending: true,
      }),
    );
  });
});
