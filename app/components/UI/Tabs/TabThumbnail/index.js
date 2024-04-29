import PropTypes from 'prop-types';
import React, { useContext, useMemo } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import ElevatedView from 'react-native-elevated-view';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { strings } from '../../../../../locales/i18n';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import Badge from '../../../../component-library/components/Badges/Badge/Badge';
import { BadgeVariant } from '../../../../component-library/components/Badges/Badge/Badge.types';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import AppConstants from '../../../../core/AppConstants';
import { getHost } from '../../../../util/browser';
import Device from '../../../../util/device';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import WebsiteIcon from '../../WebsiteIcon';
import createStyles from './TabThumbnailStyles';
import useNetworkInfo from './useNetworkInfo';
import useSelectedAccount from './useSelectedAccount';
const METAMASK_FOX = require('../../../../images/fox.png'); // eslint-disable-line import/no-commonjs

const { HOMEPAGE_URL } = AppConstants;

/**
 * View that renders a tab thumbnail to be displayed in the in-app browser.
 * The thumbnail displays the favicon and title of the website, as well as
 * a close button to close the tab.
 */
const TabThumbnail = ({ isActiveTab, tab, onClose, onSwitch }) => {
  const { colors } = useContext(ThemeContext) || mockTheme;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const Container = Device.isAndroid() ? View : ElevatedView;
  const hostname = getHost(tab.url);
  const isHomepage = hostname === getHost(HOMEPAGE_URL);
  const selectedAccount = useSelectedAccount();
  const { networkName, networkImageSource } = useNetworkInfo();

  return (
    <Container style={styles.checkWrapper} elevation={8}>
      <TouchableOpacity
        accessible
        accessibilityLabel="Switch tab"
        onPress={() => onSwitch(tab)}
        style={[styles.tabWrapper, isActiveTab && styles.activeTab]}
      >
        <View style={styles.tabHeader}>
          <View style={styles.titleButton}>
            {!isHomepage ? (
              <WebsiteIcon
                transparent
                style={styles.tabFavicon}
                title={hostname}
                url={tab.url}
              />
            ) : (
              <Image
                style={styles.tabFavicon}
                title={tab.url}
                source={METAMASK_FOX}
              />
            )}
            <Text style={styles.tabSiteName} numberOfLines={1}>
              {isHomepage ? strings('browser.new_tab') : hostname}
            </Text>
          </View>
          <TouchableOpacity
            accessible
            accessibilityLabel="Close tab"
            onPress={() => onClose(tab)}
            style={styles.closeTabButton}
          >
            <IonIcon name="ios-close" style={styles.closeTabIcon} />
          </TouchableOpacity>
        </View>
        <View style={styles.tab}>
          <Image source={{ uri: tab.image }} style={styles.tabImage} />
        </View>
        <View style={styles.footerContainer}>
          {selectedAccount?.address && (
            <View style={styles.badgeWrapperContainer}>
              <BadgeWrapper
                badgeElement={
                  <Badge
                    size={AvatarSize.Sm}
                    variant={BadgeVariant.Network}
                    imageSource={networkImageSource}
                    name={networkName}
                  />
                }
              >
                <Avatar
                  size={AvatarSize.Xs}
                  variant={AvatarVariant.Account}
                  accountAddress={selectedAccount?.address}
                />
              </BadgeWrapper>
            </View>
          )}
          <Text
            variant={TextVariant.BodySM}
            style={styles.footerText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {selectedAccount?.name ?? 'undefined account'} - {networkName}
          </Text>
        </View>
      </TouchableOpacity>
    </Container>
  );
};

TabThumbnail.propTypes = {
  /**
   * The tab object containing information about the tab.
   */
  tab: PropTypes.shape({
    /**
     * The URL of the tab.
     */
    url: PropTypes.string.isRequired,
    /**
     * The id of the tab.
     */
    id: PropTypes.number.isRequired,
    /**
     * The image URL for the tab's thumbnail.
     */
    image: PropTypes.string.isRequired,
  }).isRequired,
  /**
   * Indicates whether the tab is currently active.
   */
  isActiveTab: PropTypes.bool.isRequired,
  /**
   * The function to be called when the tab is closed.
   */
  onClose: PropTypes.func.isRequired,
  /**
   * The function to be called when the tab is switched.
   */
  onSwitch: PropTypes.func.isRequired,
};

export default TabThumbnail;
