import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  WebView,
  type WebViewMessageEvent,
} from '@metamask/react-native-webview';
import { CardHomeSelectors } from '../../Views/CardHome/CardHome.testIds';

const CARD_DETAILS_SUCCESS = 'card:details:success';
const CARD_DETAILS_FAILED = 'card:details:failed';

/** Same frame as the card artwork, 851 by 540. */
export const HOSTED_CARD_DETAILS_ASPECT_RATIO = 851 / 540;

/**
 * CardImage paints a rect with rx 31.8 inside an 851-wide viewBox.
 * The hosted page uses the same curve so its corners meet the card art.
 */
export const HOSTED_CARD_CORNER_RADIUS_RATIO = 31.8 / 851;

/**
 * The hosted document keeps a few pixels of its own page background
 * around the card. Drawing the WebView slightly past the slot, then
 * clipping, hides that edge.
 */
export const HOSTED_PAGE_OVERSCAN = 4;

/**
 * The WebView library draws a flex:1 white container around the page.
 * Pin both layers to the card slot so that container cannot grow past it.
 */
const hostedPageStyle = StyleSheet.create({
  // Overrides the WebView library's built-in white background.
  // eslint-disable-next-line react-native/no-color-literals
  page: {
    ...StyleSheet.absoluteFill,
    flex: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  container: {
    position: 'absolute',
    top: -HOSTED_PAGE_OVERSCAN,
    right: -HOSTED_PAGE_OVERSCAN,
    bottom: -HOSTED_PAGE_OVERSCAN,
    left: -HOSTED_PAGE_OVERSCAN,
    flex: 0,
  },
});

const HOSTED_PAGE_CONTENT_INSET = { top: 0, right: 0, bottom: 0, left: 0 };

type CardDetailsPageEvent =
  | typeof CARD_DETAILS_SUCCESS
  | typeof CARD_DETAILS_FAILED;

export interface HostedCardDetailsPageProps {
  url: string;
  onLoad: () => void;
  onError: () => void;
}

function readOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function allowsNavigation(requestUrl: string, origin: string): boolean {
  if (requestUrl === 'about:blank') {
    return true;
  }
  try {
    return new URL(requestUrl).origin === origin;
  } catch {
    return false;
  }
}

function readCardDetailsEvent(data: string): CardDetailsPageEvent | null {
  try {
    const parsed: unknown = JSON.parse(data);
    if (typeof parsed !== 'object' || parsed === null || !('event' in parsed)) {
      return null;
    }
    const event = (parsed as { event: unknown }).event;
    if (event === CARD_DETAILS_SUCCESS || event === CARD_DETAILS_FAILED) {
      return event;
    }
    return null;
  } catch {
    return null;
  }
}

const HostedCardDetailsPage = ({
  url,
  onLoad,
  onError,
}: HostedCardDetailsPageProps) => {
  const origin = readOrigin(url);
  const source = useMemo(() => ({ uri: url }), [url]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const cardEvent = readCardDetailsEvent(event.nativeEvent.data);
      if (cardEvent === CARD_DETAILS_SUCCESS) {
        onLoad();
      } else if (cardEvent === CARD_DETAILS_FAILED) {
        onError();
      }
    },
    [onLoad, onError],
  );

  if (!origin) {
    return null;
  }

  return (
    <WebView
      source={source}
      style={hostedPageStyle.page}
      containerStyle={hostedPageStyle.container}
      automaticallyAdjustContentInsets={false}
      automaticallyAdjustsScrollIndicatorInsets={false}
      contentInset={HOSTED_PAGE_CONTENT_INSET}
      contentInsetAdjustmentBehavior="never"
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      originWhitelist={[origin]}
      onShouldStartLoadWithRequest={(request) =>
        allowsNavigation(request.url, origin)
      }
      onMessage={handleMessage}
      onError={onError}
      onHttpError={onError}
      onContentProcessDidTerminate={onError}
      incognito
      cacheEnabled={false}
      sharedCookiesEnabled={false}
      setSupportMultipleWindows={false}
      scrollEnabled={false}
      bounces={false}
      testID={CardHomeSelectors.CARD_DETAILS_HOSTED_PAGE}
    />
  );
};

export default HostedCardDetailsPage;
