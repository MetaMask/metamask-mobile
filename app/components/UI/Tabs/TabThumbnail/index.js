import PropTypes from 'prop-types';
import React, { useContext, useMemo } from 'react';
import images from 'images/image-icons';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ElevatedView from 'react-native-elevated-view';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import Badge from '../../../../component-library/components/Badges/Badge/Badge';
import { BadgeVariant } from '../../../../component-library/components/Badges/Badge/Badge.types';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import { TextVariant } from '../../../../component-library/components/Texts/Text';
import AppConstants from '../../../../core/AppConstants';
import { selectProviderConfig } from '../../../../selectors/networkController';
import {
  fontStyles,
  colors as importedColors,
} from '../../../../styles/common';
import { getHost } from '../../../../util/browser';
import Device from '../../../../util/device';
import Networks, {
  getTestNetImageByChainId,
  isLineaMainnetByChainId,
  isMainnetByChainId,
  isTestNet
} from '../../../../util/networks';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import { useAccounts } from '../../../hooks/useAccounts';
import WebsiteIcon from '../../WebsiteIcon';

const margin = 15;
const width = Dimensions.get('window').width - margin * 2;
const height = Dimensions.get('window').height / (Device.isIphone5S() ? 4 : 5);
let paddingTop = Dimensions.get('window').height - 190;
if (Device.isIphoneX()) {
  paddingTop -= 65;
}

if (Device.isAndroid()) {
  paddingTop -= 10;
}

const DEFAULT_ACCOUNT_ADDRESS = '0x0000000000000000000000000000000000000000';

const createStyles = (colors) =>
  StyleSheet.create({
    tabFavicon: {
      alignSelf: 'flex-start',
      width: 22,
      height: 22,
      marginRight: 5,
      marginLeft: 2,
      marginTop: 1,
    },
    tabSiteName: {
      color: colors.text.default,
      ...fontStyles.bold,
      fontSize: 18,
      marginRight: 40,
      marginLeft: 5,
      marginTop: 0,
    },
    tabHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      backgroundColor: colors.background.default,
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
    tabWrapper: {
      marginBottom: 15,
      borderRadius: 10,
      elevation: 8,
      justifyContent: 'space-evenly',
      overflow: 'hidden',
      borderColor: colors.border.default,
      borderWidth: 1,
      width,
      height,
    },
    checkWrapper: {
      backgroundColor: importedColors.transparent,
      overflow: 'hidden',
    },
    tab: {
      backgroundColor: colors.background.default,
      flex: 1,
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
    },
    tabImage: {
      ...StyleSheet.absoluteFillObject,
      paddingTop,
      width: null,
      height: null,
      resizeMode: 'cover',
    },
    activeTab: {
      borderWidth: 5,
      borderColor: colors.primary.default,
    },
    closeTabIcon: {
      paddingHorizontal: 10,
      paddingTop: 3,
      fontSize: 32,
      color: colors.text.default,
      right: 0,
      marginTop: -7,
      position: 'absolute',
    },
    titleButton: {
      backgroundColor: importedColors.transparent,
      flex: 1,
      flexDirection: 'row',
      marginRight: 40,
    },
    closeTabButton: {
      backgroundColor: importedColors.transparent,
      width: Device.isIos() ? 30 : 35,
      height: 24,
      marginRight: -5,
    },
    footerContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      height: 36,
      backgroundColor: colors.background.default,
      borderTopColor: colors.border.default,
      borderTopWidth: 1,
      padding: 8,
    },
    footerText: { width: '90%' },
    badgeWrapperContainer: { paddingRight: 8, paddingLeft: 2 },
    networkBadge: {
      borderRadius: 7,
      borderWidth: 1,
      borderColor: colors.background.default,
    },
  });

const { HOMEPAGE_URL } = AppConstants;
const METAMASK_FOX = require('../../../../images/fox.png'); // eslint-disable-line import/no-commonjs

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

  const { accounts } = useAccounts();

  const selectedAccount = useMemo(() => {
    if (accounts.length > 0) {
      return accounts.find((account) => account.isSelected);
    }
    return undefined;
  }, [accounts]);

  const providerConfig = useSelector(selectProviderConfig);

  const getNetworkName = (providerConfig) => {
    if (providerConfig?.nickname) {
      return providerConfig.nickname;
    } else {
      return (
        (Networks[providerConfig.type] && Networks[providerConfig.type].name) ||
        { ...Networks.rpc, color: null }.name
      );
    }
  }

  const getNetworkBadgeSource = () => {
    if (providerConfig?.chainId) {
      const isMainnet = isMainnetByChainId(providerConfig.chainId);
      const isLineaMainnet = isLineaMainnetByChainId(providerConfig.chainId);

      if (isTestNet(providerConfig.chainId)) return getTestNetImageByChainId(providerConfig.chainId);

      if (isMainnet) return images.ETHEREUM;

      if (isLineaMainnet) return images['LINEA-MAINNET'];

      return ticker ? images[ticker] : undefined;
    }
  };

  return (
    <Container style={styles.checkWrapper} elevation={8}>
      <TouchableOpacity
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
          <View style={styles.badgeWrapperContainer}>
            <BadgeWrapper
              badgeElement={
                // TODO: figure out the badge size, according to figma should be smaller
                <Badge
                  variant={BadgeVariant.Network}
                  // TODO: get the correct image source for the active network
                  imageSource={getNetworkBadgeSource()}
                  name={'Ethereum'}
                  style={styles.networkBadge}
                />
              }
            >
              <Avatar
                // TODO: figure out the avatar size, according to figma should be smaller than Sm, but bigger than Xs
                size={AvatarSize.Sm}
                variant={AvatarVariant.Account}
                accountAddress={
                  selectedAccount?.address ??
                  DEFAULT_ACCOUNT_ADDRESS
                }
              />
            </BadgeWrapper>
          </View>
          <Text
            // TODO: figure out why the variant is not taking effect when changed
            variant={TextVariant.BodySMBold}
            style={styles.footerText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {selectedAccount?.name ?? 'undefined account'} - {getNetworkName(providerConfig)}
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
  tab: PropTypes.object.isRequired,
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
