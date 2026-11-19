import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { render, act } from '@testing-library/react-native';
import HostedCardDetailsPage, {
  HOSTED_PAGE_OVERSCAN,
} from './HostedCardDetailsPage';
import { CardHomeSelectors } from '../../Views/CardHome/CardHome.testIds';

const HOSTED_URL = 'https://cards.example/card/details?token=one';

interface CapturedWebViewProps {
  source?: { uri?: string };
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  onError?: () => void;
  onHttpError?: () => void;
  onShouldStartLoadWithRequest?: (request: { url: string }) => boolean;
  onContentProcessDidTerminate?: () => void;
  automaticallyAdjustContentInsets?: boolean;
  automaticallyAdjustsScrollIndicatorInsets?: boolean;
  contentInset?: { top: number; right: number; bottom: number; left: number };
  contentInsetAdjustmentBehavior?: string;
  containerStyle?: StyleProp<ViewStyle>;
  cacheEnabled?: boolean;
  incognito?: boolean;
  sharedCookiesEnabled?: boolean;
  setSupportMultipleWindows?: boolean;
  scrollEnabled?: boolean;
  bounces?: boolean;
  injectedJavaScript?: string;
  originWhitelist?: string[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

let latestWebViewProps: CapturedWebViewProps | null = null;

jest.mock('@metamask/react-native-webview', () => {
  const ActualReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    WebView: (props: CapturedWebViewProps) => {
      latestWebViewProps = props;
      return ActualReact.createElement(View, { testID: props.testID });
    },
  };
});

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

describe('HostedCardDetailsPage', () => {
  beforeEach(() => {
    latestWebViewProps = null;
  });

  it('loads the hosted URL once with the page locked to its origin', () => {
    const { getByTestId } = render(
      <HostedCardDetailsPage
        url={HOSTED_URL}
        onLoad={jest.fn()}
        onError={jest.fn()}
      />,
    );

    expect(
      getByTestId(CardHomeSelectors.CARD_DETAILS_HOSTED_PAGE),
    ).toBeOnTheScreen();
    expect(latestWebViewProps?.source).toEqual({ uri: HOSTED_URL });
    expect(latestWebViewProps?.incognito).toBe(true);
    expect(latestWebViewProps?.cacheEnabled).toBe(false);
    expect(latestWebViewProps?.sharedCookiesEnabled).toBe(false);
    expect(latestWebViewProps?.setSupportMultipleWindows).toBe(false);
    expect(latestWebViewProps?.scrollEnabled).toBe(false);
    expect(latestWebViewProps?.bounces).toBe(false);
    expect(latestWebViewProps?.injectedJavaScript).toBeUndefined();
    expect(latestWebViewProps?.originWhitelist).toEqual([
      'https://cards.example',
    ]);
    expect(StyleSheet.flatten(latestWebViewProps?.style)).toEqual(
      expect.objectContaining({
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        flex: 0,
      }),
    );
    expect(
      StyleSheet.flatten(latestWebViewProps?.style)?.borderRadius,
    ).toBeUndefined();
    expect(StyleSheet.flatten(latestWebViewProps?.containerStyle)).toEqual(
      expect.objectContaining({
        position: 'absolute',
        top: -HOSTED_PAGE_OVERSCAN,
        right: -HOSTED_PAGE_OVERSCAN,
        bottom: -HOSTED_PAGE_OVERSCAN,
        left: -HOSTED_PAGE_OVERSCAN,
        flex: 0,
      }),
    );
    expect(StyleSheet.flatten(latestWebViewProps?.style)?.backgroundColor).toBe(
      'transparent',
    );
    expect(latestWebViewProps?.automaticallyAdjustContentInsets).toBe(false);
    expect(latestWebViewProps?.automaticallyAdjustsScrollIndicatorInsets).toBe(
      false,
    );
    expect(latestWebViewProps?.contentInset).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    expect(latestWebViewProps?.contentInsetAdjustmentBehavior).toBe('never');
  });

  it('calls onLoad when the page reports card:details:success', () => {
    const onLoad = jest.fn();
    const onError = jest.fn();
    render(
      <HostedCardDetailsPage
        url={HOSTED_URL}
        onLoad={onLoad}
        onError={onError}
      />,
    );

    postMessage(JSON.stringify({ event: 'card:details:success' }));

    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onError when the page reports card:details:failed', () => {
    const onLoad = jest.fn();
    const onError = jest.fn();
    render(
      <HostedCardDetailsPage
        url={HOSTED_URL}
        onLoad={onLoad}
        onError={onError}
      />,
    );

    postMessage(JSON.stringify({ event: 'card:details:failed' }));

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onLoad).not.toHaveBeenCalled();
  });

  it('calls onError when the page fails to load', () => {
    const onError = jest.fn();
    render(
      <HostedCardDetailsPage
        url={HOSTED_URL}
        onLoad={jest.fn()}
        onError={onError}
      />,
    );

    fireWebView(latestWebViewProps?.onError);

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('calls onError on an HTTP error', () => {
    const onError = jest.fn();
    render(
      <HostedCardDetailsPage
        url={HOSTED_URL}
        onLoad={jest.fn()}
        onError={onError}
      />,
    );

    fireWebView(latestWebViewProps?.onHttpError);

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('calls onError when the WebView process ends', () => {
    const onError = jest.fn();
    render(
      <HostedCardDetailsPage
        url={HOSTED_URL}
        onLoad={jest.fn()}
        onError={onError}
      />,
    );

    fireWebView(latestWebViewProps?.onContentProcessDidTerminate);

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('ignores a message that is not a card details event', () => {
    const onLoad = jest.fn();
    const onError = jest.fn();
    render(
      <HostedCardDetailsPage
        url={HOSTED_URL}
        onLoad={onLoad}
        onError={onError}
      />,
    );

    postMessage('not-json');
    postMessage(JSON.stringify({ event: 'card:details:other' }));

    expect(onLoad).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('blocks navigation outside the hosted page origin', () => {
    render(
      <HostedCardDetailsPage
        url={HOSTED_URL}
        onLoad={jest.fn()}
        onError={jest.fn()}
      />,
    );

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
        url: 'about:blank',
      }),
    ).toBe(true);
    expect(
      latestWebViewProps?.onShouldStartLoadWithRequest?.({
        url: 'https://evil.example/phish',
      }),
    ).toBe(false);
  });

  it('keeps the same WebView source when the URL does not change', () => {
    const onLoad = jest.fn();
    const onError = jest.fn();
    const { rerender } = render(
      <HostedCardDetailsPage
        url={HOSTED_URL}
        onLoad={onLoad}
        onError={onError}
      />,
    );
    const source = latestWebViewProps?.source;

    rerender(
      <HostedCardDetailsPage
        url={HOSTED_URL}
        onLoad={onLoad}
        onError={onError}
      />,
    );

    expect(latestWebViewProps?.source).toBe(source);
  });
});
