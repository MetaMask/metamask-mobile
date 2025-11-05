import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import TrendingView from './TrendingView';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockIsEnabled = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn((selector) => {
    if (selector.toString().includes('dataCollectionForMarketing')) {
      return false;
    }
    return undefined;
  }),
}));

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
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEnabled.mockReturnValue(true);
  });

  it('renders native coming soon view', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <TrendingView />
      </NavigationContainer>,
    );

    const comingSoonText = getByTestId('trending-view-coming-soon');

    expect(comingSoonText).toBeDefined();
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
