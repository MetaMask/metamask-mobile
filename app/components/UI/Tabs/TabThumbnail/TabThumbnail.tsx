import React, { useContext, useMemo } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import ElevatedView from 'react-native-elevated-view';
import { strings } from '../../../../../locales/i18n';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import Badge from '../../../../component-library/components/Badges/Badge/Badge';
import { BadgeVariant } from '../../../../component-library/components/Badges/Badge/Badge.types';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useNetworkInfo } from '../../../../selectors/selectedNetworkController';
import { getHost } from '../../../../util/browser';
import Device from '../../../../util/device';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import createStyles from './TabThumbnail.styles';
import { TabThumbnailProps } from './TabThumbnail.types';
import { useSelector } from 'react-redux';
import { selectPermissionControllerState } from '../../../../selectors/snaps/permissionController';
import { getPermittedAccountsByHostname } from '../../../../core/Permissions';
import { useAccounts } from '../../../hooks/useAccounts';
import { useFavicon } from '../../../hooks/useFavicon';
import Logger from '../../../../util/Logger';


const thumbnailRenders = {}

/**
 * View that renders a tab thumbnail to be displayed in the in-app browser.
 * The thumbnail displays the favicon and title of the website, as well as
 * a close button to close the tab.
 */
const TabThumbnail = React.memo(({
  isActiveTab,
  tab,
  onClose,
  onSwitch,
}: TabThumbnailProps) => {
  const { colors } = useContext(ThemeContext) || mockTheme;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const Container: React.ElementType = Device.isAndroid() ? View : ElevatedView;
  const tabTitle = getHost(tab.url);

  // Get permitted accounts for this hostname
  const permittedAccountsList = useSelector(selectPermissionControllerState);
  const permittedAccountsByHostname = getPermittedAccountsByHostname(
    permittedAccountsList,
    tabTitle,
  );
  const activeAddress = permittedAccountsByHostname[0];
  const { evmAccounts: accounts } = useAccounts({});
  const selectedAccount = accounts.find(
    (account) => account.address.toLowerCase() === activeAddress?.toLowerCase(),
  );
  const { networkName, networkImageSource } = useNetworkInfo(tabTitle);
  const faviconSource = useFavicon(tab.url);
  if (thumbnailRenders[tab.id]) {
    thumbnailRenders[tab.id]++;
  } else {
    thumbnailRenders[tab.id] = 1;
  }
  Logger.log('TabThumbnail renders', tab.id.toString().slice(-2), thumbnailRenders[tab.id]);
  return (
    <Container style={styles.checkWrapper} elevation={8}>
      <TouchableOpacity
        accessible
        accessibilityLabel={strings('browser.switch_tab')}
        onPress={() => onSwitch(tab)}
        style={[styles.tabWrapper, isActiveTab && styles.activeTab]}
      >
        <View style={styles.tabHeader}>
          <View style={styles.titleButton}>
            <Avatar
              variant={AvatarVariant.Favicon}
              imageSource={faviconSource}
              size={AvatarSize.Md}
              style={styles.tabFavicon}
            />
            <Text style={styles.tabSiteName} numberOfLines={1}>
              {tabTitle}
            </Text>
          </View>
          <TouchableOpacity
            accessible
            accessibilityLabel={strings('browser.close_tab')}
            onPress={() => onClose(tab)}
            hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          >
            <Icon
              name={IconName.Close}
              size={IconSize.Md}
              color={IconColor.Default}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.tab}>
          <Image source={{ uri: tab.image }} style={styles.tabImage} />
        </View>
        {selectedAccount && (
          <View testID="footer-container" style={styles.footerContainer}>
            <View style={styles.badgeWrapperContainer}>
              <BadgeWrapper
                badgePosition={BadgePosition.BottomRight}
                badgeElement={
                  <Badge
                    size={AvatarSize.Xs}
                    variant={BadgeVariant.Network}
                    imageSource={networkImageSource}
                    name={networkName}
                  />
                }
              >
                <Avatar
                  size={AvatarSize.Xs}
                  variant={AvatarVariant.Account}
                  accountAddress={selectedAccount.address}
                />
              </BadgeWrapper>
            </View>
            <Text
              variant={TextVariant.BodySM}
              style={styles.footerText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {`${
                selectedAccount.name ?? strings('browser.undefined_account')
              }${networkName ? ` - ${networkName}` : ''}`}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Container>
  );
}, (prevProps, nextProps) => {
  for (const key in nextProps) {
    if (prevProps[key] !== nextProps[key]) {
      if (key === 'tab') {
        console.log('Tab object reference changed but content might be same');
      } else {
        console.log('Prop changed:', key);
      }
    }
  }

  const isActiveTabSame = prevProps.isActiveTab === nextProps.isActiveTab;
  const isTabIdSame = prevProps.tab.id === nextProps.tab.id;
  const isTabUrlSame = prevProps.tab.url === nextProps.tab.url;
  const isTabImageSame = prevProps.tab.image === nextProps.tab.image;
  const isSame = isActiveTabSame && isTabIdSame && isTabUrlSame && isTabImageSame;
  if (!isSame) {
    Logger.log('TabThumbnail is NOT SAME', nextProps.tab.id.toString().slice(-2));
  } else {
    Logger.log('TabThumbnail is SAME', nextProps.tab.id.toString().slice(-2))
  }
  return isSame;
}

);

export default TabThumbnail;
