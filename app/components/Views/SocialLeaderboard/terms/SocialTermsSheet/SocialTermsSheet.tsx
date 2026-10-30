import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  ButtonSize,
  ButtonVariant,
  Checkbox,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
  ScrollView,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { WebView } from '@metamask/react-native-webview';
import { strings } from '../../../../../../locales/i18n';
import { SocialTermsSheetSelectorsIDs } from './SocialTermsSheet.testIds';

/** Distance from the bottom that still counts as "read to the end". */
const SCROLL_END_THRESHOLD = 20;
/** Body height as a share of the window, matching the design. */
const BODY_HEIGHT_RATIO = 0.6;
const WEBVIEW_SCROLL_END_EVENT = 'social-terms-scroll-end';
const WEBVIEW_SCROLL_NOT_END_EVENT = 'social-terms-scroll-not-end';
const TERMS_BASE_URL = 'https://metamask.com';

/**
 * Android composites WebView above later siblings. Elevation keeps this
 * overlay tappable on top of the hosted terms page.
 */
const SCROLL_TO_BOTTOM_BUTTON_STYLE: StyleProp<ViewStyle> = { elevation: 8 };

const WEBVIEW_SCROLL_END_JS = `(function () {
  var atEnd = false;
  function check() {
    var scrollHeight = document.documentElement.scrollHeight;
    var next =
      scrollHeight > 0 &&
      window.scrollY + window.innerHeight + ${SCROLL_END_THRESHOLD} >= scrollHeight;
    if (next === atEnd) {
      return;
    }
    atEnd = next;
    window.ReactNativeWebView.postMessage(
      next ? '${WEBVIEW_SCROLL_END_EVENT}' : '${WEBVIEW_SCROLL_NOT_END_EVENT}'
    );
  }
  window.addEventListener('scroll', check);
  window.addEventListener('load', check);
  check();
})();
true;`;

const WEBVIEW_SCROLL_TO_END_JS =
  "window.scrollTo({ top: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight), behavior: 'smooth' }); true;";

const getUrlOrigin = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const isAllowedTermsUrl = (
  requestUrl: string,
  allowedOrigin: string | null,
): boolean =>
  getUrlOrigin(requestUrl) === allowedOrigin && allowedOrigin !== null;

export interface SocialTermsSheetProps {
  /**
   * Hosted terms page. When omitted, the local HTML or placeholder copy
   * renders instead.
   */
  uri?: string;
  /** Locally bundled HTML document used for the build-time preview. */
  html?: string;
  onAgree: () => void;
  onClose: () => void;
}

type ScrollMetrics = Pick<
  NativeScrollEvent,
  'layoutMeasurement' | 'contentOffset' | 'contentSize'
>;

const isAtEnd = ({
  layoutMeasurement,
  contentOffset,
  contentSize,
}: ScrollMetrics): boolean =>
  contentSize.height > 0 &&
  layoutMeasurement.height + contentOffset.y >=
    contentSize.height - SCROLL_END_THRESHOLD;

/**
 * Social Supplemental Terms consent sheet. The user must scroll to the end
 * before the checkbox enables, and check it before Agree enables. A circular
 * button jumps to that end and hides while the end is already on screen.
 */
const SocialTermsSheet: React.FC<SocialTermsSheetProps> = ({
  uri,
  html,
  onAgree,
  onClose,
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
  const webViewRef = useRef<WebView>(null);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const allowedOrigin = getUrlOrigin(html ? TERMS_BASE_URL : (uri ?? ''));
  const showsHostedTerms = Boolean(uri || html);

  const markReachedEnd = useCallback(() => setHasReachedEnd(true), []);

  const handleScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<ScrollMetrics>) => {
      const atEnd = isAtEnd(nativeEvent);
      setIsNearBottom(atEnd);
      if (atEnd) {
        markReachedEnd();
      }
    },
    [markReachedEnd],
  );

  // Native WebView metrics can report a viewport-sized document before it
  // loads, so only a real scroll counts here. Short documents are covered by
  // the injected script, which reads the loaded document height.
  const handleWebViewScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<ScrollMetrics>) => {
      if (nativeEvent.contentOffset.y <= 0) {
        return;
      }
      const atEnd = isAtEnd(nativeEvent);
      setIsNearBottom(atEnd);
      if (atEnd) {
        markReachedEnd();
      }
    },
    [markReachedEnd],
  );

  const scrollToBottom = useCallback(() => {
    if (showsHostedTerms) {
      webViewRef.current?.injectJavaScript(WEBVIEW_SCROLL_TO_END_JS);
      return;
    }
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [showsHostedTerms]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportHeight(event.nativeEvent.layout.height);
  }, []);

  // Content that fits without scrolling has already been read in full.
  const handleContentSizeChange = useCallback(
    (_width: number, contentHeight: number) => {
      if (
        viewportHeight > 0 &&
        contentHeight <= viewportHeight + SCROLL_END_THRESHOLD
      ) {
        setIsNearBottom(true);
        markReachedEnd();
      }
    },
    [markReachedEnd, viewportHeight],
  );

  const handleWebViewMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      if (event.nativeEvent.data === WEBVIEW_SCROLL_END_EVENT) {
        setIsNearBottom(true);
        markReachedEnd();
        return;
      }
      if (event.nativeEvent.data === WEBVIEW_SCROLL_NOT_END_EVENT) {
        setIsNearBottom(false);
      }
    },
    [markReachedEnd],
  );

  return (
    <BottomSheet
      isFullscreen={false}
      onClose={onClose}
      testID={SocialTermsSheetSelectorsIDs.SHEET}
    >
      <BottomSheetHeader
        onClose={onClose}
        closeButtonProps={{
          testID: SocialTermsSheetSelectorsIDs.CLOSE_BUTTON,
          accessibilityLabel: strings('social_leaderboard.terms.close'),
        }}
      >
        {strings('social_leaderboard.terms.title')}
      </BottomSheetHeader>
      <Box
        style={{ height: windowHeight * BODY_HEIGHT_RATIO }}
        twClassName="relative border-b border-muted"
      >
        {showsHostedTerms ? (
          <WebView
            ref={webViewRef}
            source={
              html
                ? { html, baseUrl: 'https://metamask.com' }
                : { uri: uri ?? '' }
            }
            nestedScrollEnabled
            injectedJavaScript={WEBVIEW_SCROLL_END_JS}
            onMessage={handleWebViewMessage}
            onScroll={handleWebViewScroll}
            onShouldStartLoadWithRequest={(request) =>
              isAllowedTermsUrl(request.url, allowedOrigin)
            }
            testID={SocialTermsSheetSelectorsIDs.WEBVIEW}
          />
        ) : (
          <ScrollView
            ref={scrollViewRef}
            onScroll={handleScroll}
            onLayout={handleLayout}
            onContentSizeChange={handleContentSizeChange}
            scrollEventThrottle={50}
            testID={SocialTermsSheetSelectorsIDs.BODY}
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="px-4 py-3"
            >
              {strings('social_leaderboard.terms.placeholder_body')}
            </Text>
          </ScrollView>
        )}
        {isNearBottom ? null : (
          <ButtonIcon
            iconName={IconName.ArrowDown}
            size={ButtonIconSize.Lg}
            variant={ButtonIconVariant.Floating}
            onPress={scrollToBottom}
            accessibilityLabel={strings(
              'social_leaderboard.terms.scroll_to_bottom',
            )}
            accessibilityRole="button"
            hitSlop={12}
            testID={SocialTermsSheetSelectorsIDs.SCROLL_TO_BOTTOM_BUTTON}
            twClassName="absolute bottom-4 right-4 z-10"
            style={SCROLL_TO_BOTTOM_BUTTON_STYLE}
          />
        )}
      </Box>
      <Box twClassName="px-4 pt-4 pb-6 gap-4">
        <Checkbox
          isSelected={isChecked}
          isDisabled={!hasReachedEnd}
          onChange={setIsChecked}
          label={strings('social_leaderboard.terms.checkbox')}
          labelProps={{ style: { flex: 1 } }}
          testID={SocialTermsSheetSelectorsIDs.CHECKBOX}
        />
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={!isChecked}
          onPress={onAgree}
          testID={SocialTermsSheetSelectorsIDs.AGREE_BUTTON}
        >
          {strings('social_leaderboard.terms.agree')}
        </Button>
        {hasReachedEnd ? null : (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            testID={SocialTermsSheetSelectorsIDs.SCROLL_HELPER}
          >
            {strings('social_leaderboard.terms.scroll_helper')}
          </Text>
        )}
      </Box>
    </BottomSheet>
  );
};

export default SocialTermsSheet;
