import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CardViewCardDetails from './CardViewCardDetails';
import { CardViewCardDetailsSelectors } from './CardViewCardDetails.testIds';
import { CARD_DETAILS_CSS } from '../../hooks/useCardDetailsToken';
import { CardType } from '../../types';
import { ToastContext } from '../../../../../component-library/components/Toast';

const HOSTED_URL = 'https://cards.example/card/details?token=one';
const NEXT_HOSTED_URL = 'https://cards.example/card/details?token=two';

const mockGoBack = jest.fn();
const mockGetCardDetailsView = jest.fn();
const mockShowToast = jest.fn();
const mockGetHardwareTier = jest.fn((): string | null => null);
const mockUseNetworkTier = jest.fn((): string | null => null);

let mockHostedPageUrl = HOSTED_URL;

interface CapturedWebViewProps {
  source?: { uri?: string };
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  onError?: () => void;
  onHttpError?: () => void;
  onShouldStartLoadWithRequest?: (request: { url: string }) => boolean;
  onContentProcessDidTerminate?: () => void;
  cacheEnabled?: boolean;
  incognito?: boolean;
  pullToRefreshEnabled?: boolean;
  injectedJavaScript?: string;
  originWhitelist?: string[];
}

let latestWebViewProps: CapturedWebViewProps | null = null;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { hostedPageUrl: mockHostedPageUrl } }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    CardController: {
      getCardDetailsView: (...args: unknown[]) =>
        mockGetCardDetailsView(...args),
    },
  },
}));

jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: () => mockGetHardwareTier(),
}));

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockUseNetworkTier(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../components/CardScreenshotDeterrent', () => ({
  CardScreenshotDeterrent: () => null,
}));

jest.mock('@metamask/react-native-webview', () => {
  const ActualReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    WebView: (props: CapturedWebViewProps & { testID?: string }) => {
      latestWebViewProps = props;
      return ActualReact.createElement(View, { testID: props.testID });
    },
  };
});

const toastRef = { current: { showToast: mockShowToast } };

const renderScreen = () =>
  render(
    <ToastContext.Provider value={{ toastRef }}>
      <CardViewCardDetails />
    </ToastContext.Provider>,
  );

const postMessage = (data: string) => {
  act(() => {
    latestWebViewProps?.onMessage?.({ nativeEvent: { data } });
  });
};

const fireWebView = (handler?: () => void) => {
  act(() => {
    handler?.();
  });
};

describe('CardViewCardDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestWebViewProps = null;
    mockHostedPageUrl = HOSTED_URL;
    mockGetHardwareTier.mockReturnValue(null);
    mockUseNetworkTier.mockReturnValue(null);
    mockGetCardDetailsView.mockResolvedValue({
      token: 'two',
      hostedPageUrl: NEXT_HOSTED_URL,
    });
  });

  it('loads hostedPageUrl once in a WebView and keeps it open on success', () => {
    const { getByTestId } = renderScreen();

    expect(getByTestId(CardViewCardDetailsSelectors.WEBVIEW)).toBeOnTheScreen();
    expect(latestWebViewProps?.source).toEqual({ uri: HOSTED_URL });
    expect(latestWebViewProps?.incognito).toBe(true);
    expect(latestWebViewProps?.cacheEnabled).toBe(false);
    expect(latestWebViewProps?.pullToRefreshEnabled).toBe(false);
    expect(latestWebViewProps?.injectedJavaScript).toBeUndefined();
    expect(latestWebViewProps?.originWhitelist).toEqual([
      'https://cards.example',
    ]);

    postMessage(JSON.stringify({ event: 'card:details:success' }));

    expect(getByTestId(CardViewCardDetailsSelectors.WEBVIEW)).toBeOnTheScreen();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockGetCardDetailsView).not.toHaveBeenCalled();
  });

  it('dismisses the WebView and shows an error toast when the page reports card:details:failed', () => {
    const { getByTestId, queryByTestId } = renderScreen();

    postMessage(JSON.stringify({ event: 'card:details:failed' }));

    expect(queryByTestId(CardViewCardDetailsSelectors.WEBVIEW)).toBeNull();
    expect(getByTestId(CardViewCardDetailsSelectors.ERROR)).toBeOnTheScreen();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'card.card_home.view_card_details_error' }],
      }),
    );
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('dismisses the WebView and shows an error toast when the page fails to load', () => {
    const { queryByTestId } = renderScreen();

    fireWebView(latestWebViewProps?.onError);

    expect(queryByTestId(CardViewCardDetailsSelectors.WEBVIEW)).toBeNull();
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('dismisses the WebView and shows an error toast on an HTTP error', () => {
    const { queryByTestId } = renderScreen();

    fireWebView(latestWebViewProps?.onHttpError);

    expect(queryByTestId(CardViewCardDetailsSelectors.WEBVIEW)).toBeNull();
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('ignores a message that is not a card details event', () => {
    const { getByTestId } = renderScreen();

    postMessage('not-json');
    postMessage(JSON.stringify({ event: 'card:details:other' }));

    expect(getByTestId(CardViewCardDetailsSelectors.WEBVIEW)).toBeOnTheScreen();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('stays on the error when a retry response has no hostedPageUrl', async () => {
    mockGetCardDetailsView.mockResolvedValue({
      token: 'img',
      imageUrl: 'https://cards.example/details-image?token=img',
    });
    const { getByTestId, queryByTestId } = renderScreen();

    fireWebView(latestWebViewProps?.onError);
    fireEvent.press(getByTestId(CardViewCardDetailsSelectors.RETRY_BUTTON));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledTimes(2);
    });
    expect(queryByTestId(CardViewCardDetailsSelectors.WEBVIEW)).toBeNull();
    expect(getByTestId(CardViewCardDetailsSelectors.ERROR)).toBeOnTheScreen();
  });

  it('requests a new card details token when retry is pressed', async () => {
    const { getByTestId } = renderScreen();

    fireWebView(latestWebViewProps?.onError);

    fireEvent.press(getByTestId(CardViewCardDetailsSelectors.RETRY_BUTTON));

    await waitFor(() => {
      expect(
        getByTestId(CardViewCardDetailsSelectors.WEBVIEW),
      ).toBeOnTheScreen();
    });
    expect(mockGetCardDetailsView).toHaveBeenCalledTimes(1);
    expect(mockGetCardDetailsView).toHaveBeenCalledWith({
      customCss: CARD_DETAILS_CSS[CardType.VIRTUAL],
    });
    expect(latestWebViewProps?.source).toEqual({ uri: NEXT_HOSTED_URL });
    expect(latestWebViewProps?.source?.uri).not.toBe(HOSTED_URL);
  });

  it('requests a new token when the WebView process ends instead of reloading the old URL', async () => {
    const { getByTestId } = renderScreen();

    await act(async () => {
      latestWebViewProps?.onContentProcessDidTerminate?.();
    });

    await waitFor(() => {
      expect(latestWebViewProps?.source).toEqual({ uri: NEXT_HOSTED_URL });
    });
    expect(getByTestId(CardViewCardDetailsSelectors.WEBVIEW)).toBeOnTheScreen();
    expect(mockGetCardDetailsView).toHaveBeenCalledTimes(1);
  });

  it('stays on the error and skips a new token request when the network is offline', () => {
    mockUseNetworkTier.mockReturnValue('NONE');

    const { queryByTestId, getByTestId } = renderScreen();

    expect(queryByTestId(CardViewCardDetailsSelectors.WEBVIEW)).toBeNull();
    expect(getByTestId(CardViewCardDetailsSelectors.ERROR)).toBeOnTheScreen();

    fireEvent.press(getByTestId(CardViewCardDetailsSelectors.RETRY_BUTTON));

    expect(mockGetCardDetailsView).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('shows the hosted page on a low-end device when the network tier is unknown', () => {
    mockGetHardwareTier.mockReturnValue('LOW');
    mockUseNetworkTier.mockReturnValue(null);

    const { getByTestId } = renderScreen();

    expect(getByTestId(CardViewCardDetailsSelectors.WEBVIEW)).toBeOnTheScreen();
  });

  it('blocks navigation outside the hosted page origin', () => {
    renderScreen();

    expect(
      latestWebViewProps?.onShouldStartLoadWithRequest?.({
        url: HOSTED_URL,
      }),
    ).toBe(true);
    expect(
      latestWebViewProps?.onShouldStartLoadWithRequest?.({
        url: 'https://cards.example/card/details/assets/app.js',
      }),
    ).toBe(true);
    expect(
      latestWebViewProps?.onShouldStartLoadWithRequest?.({
        url: 'https://evil.example/phish',
      }),
    ).toBe(false);
  });

  it('closes the screen from the close button', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(CardViewCardDetailsSelectors.CLOSE_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
