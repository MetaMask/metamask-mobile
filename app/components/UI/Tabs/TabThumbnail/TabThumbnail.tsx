import React, { useContext, useMemo } from 'react';
import { Image, View } from 'react-native';
import TouchableOpacity from '../../../Base/TouchableOpacity';
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
import { getPermittedEvmAddressesByHostname } from '../../../../core/Permissions';
import { useFavicon } from '../../../hooks/useFavicon';
import { selectInternalAccounts } from '../../../../selectors/accountsController';
import { areAddressesEqual } from '../../../../util/address';

/**
 * View that renders a tab thumbnail to be displayed in the in-app browser.
 * The thumbnail displays the favicon and title of the website, as well as
 * a close button to close the tab.
 */
const TabThumbnail = ({
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
  const permittedAccountsByHostname = getPermittedEvmAddressesByHostname(
    permittedAccountsList,
    tabTitle,
  );

  // This only works for EVM currently
  const activeAddress = permittedAccountsByHostname[0];
  const internalAccounts = useSelector(selectInternalAccounts);
  const selectedAccount = internalAccounts.find((account) =>
    areAddressesEqual(account.address, activeAddress),
  );
  const { networkName, networkImageSource } = useNetworkInfo(tabTitle);
  const { faviconURI: faviconSource } = useFavicon(tab.url);

  return (
    <Container style={styles.checkWrapper} elevation={8}>
      <TouchableOpacity
        accessible
        accessibilityLabel={strings('browser.switch_tab')}
        onPress={() => onSwitch(tab)}
        style={[styles.tabWrapper, isActiveTab && styles.activeTab]}
        testID={`browser-tab-${tab.id}`}
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
            testID={`tab-close-button-${tab.id}`}
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
        {!!selectedAccount && (
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
                selectedAccount.metadata?.name ??
                strings('browser.undefined_account')
              }${networkName ? ` - ${networkName}` : ''}`}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Container>
  );
};

export default TabThumbnail;
