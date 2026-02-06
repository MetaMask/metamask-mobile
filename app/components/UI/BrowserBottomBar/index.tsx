import React, { useCallback, useMemo } from 'react';
import { Platform, ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Device from '../../../util/device';
import { BrowserViewSelectorsIDs } from '../../Views/BrowserTab/BrowserView.testIds';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { addBookmark, removeBookmark } from '../../../actions/bookmarks';
import SearchApi from '@metamask/react-native-search-api';
import Logger from '../../../util/Logger';
import { RootState } from '../../../reducers';
import { SessionENSNames } from '../../Views/BrowserTab/types';
import { selectBrowserTabCount } from '../../../reducers/browser/selectors';

interface BrowserBottomBarProps {
  /**
   * Boolean that determines if you can navigate back
   */
  canGoBack?: boolean;
  /**
   * Boolean that determines if you can navigate forward
   */
  canGoForward?: boolean;
  /**
   * Function that allows you to navigate back
   */
  goBack?: () => void;
  /**
   * Function that allows you to navigate forward
   */
  goForward?: () => void;
  /**
   * Function that reloads the current page
   */
  reload?: () => void;
  /**
   * Function that opens a new tab
   */
  openNewTab?: () => void;
  /**
   * Current active URL
   */
  activeUrl: string;
  /**
   * Function to get masked URL with ENS names
   */
  getMaskedUrl: (url: string, sessionENSNames: SessionENSNames) => string;
  /**
   * Current page title
   */
  title: string;
  /**
   * Session ENS names
   */
  sessionENSNames: SessionENSNames;
  /**
   * Favicon for the current page
   */
  favicon: ImageSourcePropType;
  /**
   * Icon for the current page
   */
  icon?: ImageSourcePropType;
}

const MemoizedButtonIcon = React.memo(ButtonIcon);

/**
 * Browser bottom bar that contains icons for navigation,
 * bookmark management, and tab operations
 */
const BrowserBottomBar: React.FC<BrowserBottomBarProps> = ({
  canGoBack,
  canGoForward,
  goBack,
  goForward,
  reload,
  openNewTab,
  activeUrl,
  getMaskedUrl,
  title,
  sessionENSNames,
  favicon,
  icon,
}) => {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useMetrics();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const bookmarks = useSelector((state: RootState) => state.bookmarks);
  const tabCount = useSelector(selectBrowserTabCount);

  const maskedActiveUrl = useMemo(
    () => getMaskedUrl(activeUrl, sessionENSNames),
    [activeUrl, getMaskedUrl, sessionENSNames],
  );

  const trackNavigationEvent = useCallback(
    (navigationOption: string): void => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.BROWSER_NAVIGATION)
          .addProperties({
            option_chosen: navigationOption,
            os: Platform.OS,
          })
          .build(),
      );
    },
    [trackEvent, createEventBuilder],
  );

  /**
   * Check if current URL is bookmarked
   */
  const isBookmarked = useMemo(
    () => bookmarks.some(({ url }: { url: string }) => url === maskedActiveUrl),
    [bookmarks, maskedActiveUrl],
  );

  /**
   * Navigate to AddBookmarkView modal
   */
  const navigateToAddBookmark = useCallback(() => {
    navigation.push('AddBookmarkView', {
      screen: 'AddBookmark',
      params: {
        title: title || '',
        url: maskedActiveUrl,
        onAddBookmark: async ({
          name,
          url: urlToAdd,
        }: {
          name: string;
          url: string;
        }) => {
          dispatch(addBookmark({ name, url: urlToAdd }));
          // iOS Spotlight integration
          if (Device.isIos()) {
            const thumbnailUri =
              (icon as { uri?: string })?.uri ||
              (favicon as { uri?: string })?.uri ||
              '';
            const item = {
              uniqueIdentifier: activeUrl,
              title: name || getMaskedUrl(urlToAdd, sessionENSNames),
              contentDescription: `Launch ${name || urlToAdd} on MetaMask`,
              keywords: [
                ...(name ? name.split(' ').filter(Boolean) : []),
                urlToAdd,
                'dapp',
              ],
              thumbnail: {
                uri: thumbnailUri,
              },
            };
            try {
              SearchApi.indexSpotlightItem(item);
            } catch (e: unknown) {
              const searchApiError = e as Error;
              Logger.error(searchApiError, 'Error adding to spotlight');
            }
          }
        },
      },
    });

    // Track analytics
    trackEvent(
      createEventBuilder(MetaMetricsEvents.BROWSER_ADD_FAVORITES)
        .addProperties({
          dapp_name: title || '',
        })
        .build(),
    );
    trackEvent(
      createEventBuilder(MetaMetricsEvents.DAPP_ADD_TO_FAVORITE).build(),
    );
  }, [
    navigation,
    title,
    activeUrl,
    maskedActiveUrl,
    getMaskedUrl,
    sessionENSNames,
    dispatch,
    icon,
    favicon,
    trackEvent,
    createEventBuilder,
  ]);

  /**
   * Check if bookmark button should be disabled
   */
  const isBookmarkDisabled = useMemo(
    () => !activeUrl || activeUrl.trim() === '',
    [activeUrl],
  );

  /**
   * Handle bookmark button press - add or remove bookmark
   */
  const handleBookmarkPress = useCallback(() => {
    // Don't allow bookmarking empty URLs
    if (isBookmarkDisabled) return;

    if (isBookmarked) {
      const bookmarkToRemove = bookmarks.find(
        ({ url }: { url: string }) => url === maskedActiveUrl,
      );
      if (bookmarkToRemove) {
        dispatch(removeBookmark(bookmarkToRemove));
      }
    } else {
      navigateToAddBookmark();
    }
  }, [
    isBookmarkDisabled,
    isBookmarked,
    maskedActiveUrl,
    bookmarks,
    dispatch,
    navigateToAddBookmark,
  ]);

  const onBackPress = useCallback((): void => {
    if (goBack) {
      goBack();
      trackNavigationEvent('Go Back');
    }
  }, [goBack, trackNavigationEvent]);

  const onForwardPress = useCallback((): void => {
    if (goForward) {
      goForward();
      trackNavigationEvent('Go Forward');
    }
  }, [goForward, trackNavigationEvent]);

  const onReloadPress = useCallback((): void => {
    if (reload) {
      reload();
      trackEvent(createEventBuilder(MetaMetricsEvents.BROWSER_RELOAD).build());
    }
  }, [reload, trackEvent, createEventBuilder]);

  const onNewTabPress = useCallback((): void => {
    if (openNewTab) {
      openNewTab();
      trackEvent(
        createEventBuilder(MetaMetricsEvents.BROWSER_NEW_TAB)
          .addProperties({
            option_chosen: 'Browser Bottom Bar',
            number_of_tabs: tabCount,
          })
          .build(),
      );
    }
  }, [openNewTab, trackEvent, createEventBuilder, tabCount]);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="bg-default border-t border-muted min-h-[60px] px-4 py-2"
      style={tw.style(
        Device.isAndroid() ? 'border-t-0' : '',
        bottomInset > 0 ? `pb-[${bottomInset}px]` : '',
      )}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-4"
      >
        {/* Back Button */}
        <MemoizedButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Lg}
          onPress={onBackPress}
          isDisabled={!canGoBack}
          testID={BrowserViewSelectorsIDs.BACK_BUTTON}
        />

        {/* Forward Button */}
        <MemoizedButtonIcon
          iconName={IconName.ArrowRight}
          size={ButtonIconSize.Lg}
          onPress={onForwardPress}
          isDisabled={!canGoForward}
          testID={BrowserViewSelectorsIDs.FORWARD_BUTTON}
        />

        {/* Reload Button */}
        <MemoizedButtonIcon
          iconName={IconName.Refresh}
          size={ButtonIconSize.Lg}
          onPress={onReloadPress}
          testID={BrowserViewSelectorsIDs.RELOAD_BUTTON}
        />
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-4"
      >
        {/* Bookmark Button */}
        <MemoizedButtonIcon
          iconName={isBookmarked ? IconName.StarFilled : IconName.Star}
          size={ButtonIconSize.Lg}
          onPress={handleBookmarkPress}
          isDisabled={isBookmarkDisabled}
          testID={BrowserViewSelectorsIDs.BOOKMARK_BUTTON}
        />

        {/* New Tab Button */}
        <MemoizedButtonIcon
          iconName={IconName.Add}
          size={ButtonIconSize.Lg}
          onPress={onNewTabPress}
          testID={BrowserViewSelectorsIDs.NEW_TAB_BUTTON}
        />
      </Box>
    </Box>
  );
};

export default React.memo(BrowserBottomBar);
