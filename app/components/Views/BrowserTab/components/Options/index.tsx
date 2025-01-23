import React, { MutableRefObject, useCallback } from 'react';
import {
  Linking,
  Platform,
  Text,
  TouchableWithoutFeedback,
  View,
  ImageSourcePropType,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import generateTestId from '../../../../../../wdio/utils/generateTestId';
import Device from '../../../../../util/device';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './styles';
import Button from '../../../../UI/Button';
import { strings } from '../../../../../../locales/i18n';
import {
  ADD_FAVORITES_OPTION,
  MENU_ID,
  NEW_TAB_OPTION,
  OPEN_FAVORITES_OPTION,
  OPEN_IN_BROWSER_OPTION,
  RELOAD_OPTION,
  SHARE_OPTION,
} from '../../../../../../wdio/screen-objects/testIDs/BrowserScreen/OptionMenu.testIds';
import Icon from 'react-native-vector-icons/FontAwesome';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import Logger from '../../../../../util/Logger';
import { OLD_HOMEPAGE_URL_HOST } from '../../constants';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { SessionENSNames } from '../../types';
import { useDispatch, useSelector } from 'react-redux';
import SearchApi from '@metamask/react-native-search-api';
import Share from 'react-native-share';

import { addBookmark } from '../../../../../actions/bookmarks';
import { RootState } from '../../../../../reducers';

interface OptionsProps {
  toggleOptions: () => void;
  onNewTabPress: () => void;
  toggleOptionsIfNeeded: () => void;
  activeUrl: string;
  isHomepage: () => boolean;
  getMaskedUrl: (urlToMask: string, sessionENSNames: SessionENSNames) => string;
  onSubmitEditing: (url: string) => void;
  title: MutableRefObject<string>;
  reload: () => void;
  sessionENSNames: SessionENSNames;
  favicon: ImageSourcePropType;
  icon: MutableRefObject<ImageSourcePropType | undefined>;
}

/**
 * Render the options menu of the browser tab
 */
const Options = ({
  toggleOptions,
  onNewTabPress,
  toggleOptionsIfNeeded,
  activeUrl,
  isHomepage,
  getMaskedUrl,
  onSubmitEditing,
  title,
  reload,
  sessionENSNames,
  favicon,
  icon,
}: OptionsProps) => {
  // This any can be removed when react navigation is bumped to v6 - issue https://github.com/react-navigation/react-navigation/issues/9037#issuecomment-735698288
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const dispatch = useDispatch();
  const bookmarks = useSelector((state: RootState) => state.bookmarks);

  /**
  /**
   * Open external link
   */
  const openInBrowser = () => {
    toggleOptionsIfNeeded();
    Linking.openURL(activeUrl).catch((openInBrowserError) =>
      Logger.log(
        `Error while trying to open external link: ${activeUrl}`,
        openInBrowserError,
      ),
    );
    trackEvent(
      createEventBuilder(MetaMetricsEvents.DAPP_OPEN_IN_BROWSER).build(),
    );
  };
  /**
   * Go to favorites page
   */
  const goToFavorites = async () => {
    toggleOptionsIfNeeded();
    onSubmitEditing(OLD_HOMEPAGE_URL_HOST);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.DAPP_GO_TO_FAVORITES).build(),
    );
  };

  /**
   * Track add site to favorites event
   */
  const trackAddToFavoritesEvent = () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.BROWSER_ADD_FAVORITES)
        .addProperties({
          dapp_name: title.current || '',
        })
        .build(),
    );
  };

  /**
   * Add bookmark
   */
  const navigateToAddBookmark = () => {
    toggleOptionsIfNeeded();
    navigation.push('AddBookmarkView', {
      screen: 'AddBookmark',
      params: {
        title: title.current || '',
        url: getMaskedUrl(activeUrl, sessionENSNames),
        onAddBookmark: async ({
          name,
          url: urlToAdd,
        }: {
          name: string;
          url: string;
        }) => {
          dispatch(addBookmark({ name, url: urlToAdd }));
          if (Device.isIos()) {
            const item = {
              uniqueIdentifier: activeUrl,
              title: name || getMaskedUrl(urlToAdd, sessionENSNames),
              contentDescription: `Launch ${name || urlToAdd} on MetaMask`,
              keywords: [name.split(' '), urlToAdd, 'dapp'],
              thumbnail: {
                uri: icon.current || favicon,
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
    trackAddToFavoritesEvent();
    trackEvent(
      createEventBuilder(MetaMetricsEvents.DAPP_ADD_TO_FAVORITE).build(),
    );
  };

  /**
   * Renders Go to Favorites option
   */
  const renderGoToFavorites = () => (
    <Button onPress={goToFavorites} style={styles.option}>
      <View style={styles.optionIconWrapper}>
        <Icon name="star" size={16} style={styles.optionIcon} />
      </View>
      <Text
        style={styles.optionText}
        numberOfLines={2}
        {...generateTestId(Platform, OPEN_FAVORITES_OPTION)}
      >
        {strings('browser.go_to_favorites')}
      </Text>
    </Button>
  );

  /**
   * Handles reload button press
   */
  const onReloadPress = useCallback(() => {
    toggleOptionsIfNeeded();
    reload();
    trackEvent(createEventBuilder(MetaMetricsEvents.BROWSER_RELOAD).build());
  }, [reload, toggleOptionsIfNeeded, trackEvent, createEventBuilder]);

  const isBookmark = () => {
    const maskedUrl = getMaskedUrl(activeUrl, sessionENSNames);
    return bookmarks.some(
      ({ url: bookmark }: { url: string }) => bookmark === maskedUrl,
    );
  };

  /**
   * Track share site event
   */
  const trackShareEvent = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.BROWSER_SHARE_SITE).build(),
    );
  }, [trackEvent, createEventBuilder]);

  /**
   * Share url
   */
  const share = useCallback(() => {
    toggleOptionsIfNeeded();
    Share.open({
      url: activeUrl,
    }).catch((err) => {
      Logger.log('Error while trying to share address', err);
    });
    trackShareEvent();
  }, [activeUrl, toggleOptionsIfNeeded, trackShareEvent]);

  /**
   * Render share option
   */
  const renderShareOption = useCallback(
    () =>
      activeUrl ? (
        <Button onPress={share} style={styles.option}>
          <View style={styles.optionIconWrapper}>
            <Icon name="share" size={15} style={styles.optionIcon} />
          </View>
          <Text
            style={styles.optionText}
            numberOfLines={2}
            {...generateTestId(Platform, SHARE_OPTION)}
          >
            {strings('browser.share')}
          </Text>
        </Button>
      ) : null,
    [activeUrl, share, styles],
  );

  /**
   * Render reload option
   */
  const renderReloadOption = useCallback(
    () =>
      activeUrl ? (
        <Button onPress={onReloadPress} style={styles.option}>
          <View style={styles.optionIconWrapper}>
            <Icon name="refresh" size={15} style={styles.optionIcon} />
          </View>
          <Text
            style={styles.optionText}
            numberOfLines={2}
            {...generateTestId(Platform, RELOAD_OPTION)}
          >
            {strings('browser.reload')}
          </Text>
        </Button>
      ) : null,
    [activeUrl, onReloadPress, styles],
  );

  /**
   * Render non-homepage options menu
   */
  const renderNonHomeOptions = () => {
    if (isHomepage()) return renderGoToFavorites();
    return (
      <React.Fragment>
        {renderReloadOption()}
        {!isBookmark() && (
          <Button onPress={navigateToAddBookmark} style={styles.option}>
            <View style={styles.optionIconWrapper}>
              <Icon name="plus-square" size={16} style={styles.optionIcon} />
            </View>
            <Text
              style={styles.optionText}
              numberOfLines={2}
              {...generateTestId(Platform, ADD_FAVORITES_OPTION)}
            >
              {strings('browser.add_to_favorites')}
            </Text>
          </Button>
        )}
        {renderGoToFavorites()}
        {renderShareOption()}
        <Button onPress={openInBrowser} style={styles.option}>
          <View style={styles.optionIconWrapper}>
            <Icon name="expand" size={16} style={styles.optionIcon} />
          </View>
          <Text
            style={styles.optionText}
            numberOfLines={2}
            {...generateTestId(Platform, OPEN_IN_BROWSER_OPTION)}
          >
            {strings('browser.open_in_browser')}
          </Text>
        </Button>
      </React.Fragment>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={toggleOptions}>
      <View style={styles.optionsOverlay}>
        <View
          style={[
            styles.optionsWrapper,
            Device.isAndroid()
              ? styles.optionsWrapperAndroid
              : styles.optionsWrapperIos,
          ]}
          {...generateTestId(Platform, MENU_ID)}
        >
          <Button onPress={onNewTabPress} style={styles.option}>
            <View style={styles.optionIconWrapper}>
              <MaterialCommunityIcons
                name="plus"
                size={18}
                style={styles.optionIcon}
              />
            </View>
            <Text
              style={styles.optionText}
              numberOfLines={1}
              {...generateTestId(Platform, NEW_TAB_OPTION)}
            >
              {strings('browser.new_tab')}
            </Text>
          </Button>
          {renderNonHomeOptions()}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default Options;
