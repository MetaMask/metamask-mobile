import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TrendingView from './TrendingView';

const mockNavigate = jest.fn();
const mockIsEnabled = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
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

describe('TrendingView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsEnabled.mockReturnValue(true);
  });

  it('renders webview with HTML content', () => {
    const { getByTestId } = render(<TrendingView />);

    const webview = getByTestId('trending-view-webview');

    expect(webview).toBeDefined();
    expect(webview.props.source.html).toBeDefined();
    expect(webview.props.source.html).toContain('Trending tokens coming soon');
  });

  it('renders browser button in header', () => {
    const { getByTestId } = render(<TrendingView />);

    const browserButton = getByTestId('trending-view-browser-button');

    expect(browserButton).toBeDefined();
  });

  it('renders title in native header', () => {
    const { getByText } = render(<TrendingView />);

    expect(getByText('Trending')).toBeDefined();
  });

  it('includes theme colors in HTML', () => {
    const { getByTestId } = render(<TrendingView />);

    const webview = getByTestId('trending-view-webview');
    const htmlContent = webview.props.source.html;

    expect(htmlContent).toContain('background-color');
    expect(htmlContent).toContain('color');
  });

  it('navigates to browser with portfolio URL when browser button is pressed', () => {
    const { getByTestId } = render(<TrendingView />);
    const browserButton = getByTestId('trending-view-browser-button');

    fireEvent.press(browserButton);

    expect(mockNavigate).toHaveBeenCalledWith('BrowserTabHome', {
      screen: 'BrowserView',
      params: {
        newTabUrl: expect.stringContaining('?metamaskEntry=mobile'),
        timestamp: expect.any(Number),
        fromTrending: true,
      },
    });
  });
});
