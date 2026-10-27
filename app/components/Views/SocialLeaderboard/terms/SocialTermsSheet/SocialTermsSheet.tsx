import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Checkbox,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { WebView } from '@metamask/react-native-webview';
import { strings } from '../../../../../../locales/i18n';
import { SocialTermsSheetSelectorsIDs } from './SocialTermsSheet.testIds';

/** Distance from the bottom that still counts as "read to the end". */
const SCROLL_END_THRESHOLD = 20;
/** Body height as a share of the window, matching the design. */
const BODY_HEIGHT_RATIO = 0.6;
const WEBVIEW_SCROLL_END_EVENT = 'social-terms-scroll-end';

const WEBVIEW_SCROLL_END_JS = `(function () {
  function check() {
    if (window.scrollY + window.innerHeight + ${SCROLL_END_THRESHOLD} >= document.documentElement.scrollHeight) {
      window.ReactNativeWebView.postMessage('${WEBVIEW_SCROLL_END_EVENT}');
    }
  }
  window.addEventListener('scroll', check);
  check();
})();
true;`;

export interface SocialTermsSheetProps {
  /**
   * Hosted terms page. When omitted, the placeholder copy renders instead.
   */
  uri?: string;
  onAgree: () => void;
  onClose: () => void;
}

const isAtEnd = ({
  layoutMeasurement,
  contentOffset,
  contentSize,
}: NativeScrollEvent): boolean =>
  layoutMeasurement.height + contentOffset.y >=
  contentSize.height - SCROLL_END_THRESHOLD;

/**
 * Social Supplemental Terms consent sheet. The user must scroll to the end
 * before the checkbox enables, and check it before Agree enables.
 */
const SocialTermsSheet: React.FC<SocialTermsSheetProps> = ({
  uri,
  onAgree,
  onClose,
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);

  const markReachedEnd = useCallback(() => setHasReachedEnd(true), []);

  const handleScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isAtEnd(nativeEvent)) {
        markReachedEnd();
      }
    },
    [markReachedEnd],
  );

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
        markReachedEnd();
      }
    },
    [markReachedEnd, viewportHeight],
  );

  const handleWebViewMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      if (event.nativeEvent.data === WEBVIEW_SCROLL_END_EVENT) {
        markReachedEnd();
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
        twClassName="border-b border-muted"
      >
        {uri ? (
          <WebView
            source={{ uri }}
            nestedScrollEnabled
            injectedJavaScript={WEBVIEW_SCROLL_END_JS}
            onMessage={handleWebViewMessage}
            onShouldStartLoadWithRequest={(request) => request.url === uri}
            testID={SocialTermsSheetSelectorsIDs.WEBVIEW}
          />
        ) : (
          <ScrollView
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
      </Box>
      <Box twClassName="px-4 pt-4 pb-6 gap-4">
        <Checkbox
          isSelected={isChecked}
          isDisabled={!hasReachedEnd}
          onChange={setIsChecked}
          label={strings('social_leaderboard.terms.checkbox')}
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
