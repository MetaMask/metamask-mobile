import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import {
  AvatarFavicon,
  AvatarFaviconSize,
  AvatarIcon,
  AvatarIconSize,
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  IconName,
} from '@metamask/design-system-react-native';
import type { ImageOrSvgSrc } from '@metamask/design-system-react-native/dist/components/temp-components/ImageOrSvg/ImageOrSvg.types.d.cts';
import {
  getHost,
  PageFaviconIcon,
  resolvePageFaviconImageSource,
} from '../../../util/browser';
import { ConnectedAccountsSelectorsIDs } from '../../Views/AccountConnect/ConnectedAccountModal.testIds';

export interface PermissionsSummaryPageInfo {
  currentEnsName: string;
  url: string;
  icon?: PageFaviconIcon;
}

export interface PermissionsSummaryTopIconProps {
  currentPageInformation: PermissionsSummaryPageInfo;
  isAlreadyConnected?: boolean;
  showPermissionsOnly?: boolean;
  networkName: string;
  networkImageSource: ImageOrSvgSrc;
  onSwitchNetwork: () => void;
  containerStyle: StyleProp<ViewStyle>;
}

/**
 * Matches iOS VoiceOver aggregation of the dapp avatar letter and network badge
 * letter (joined with ", "), used by connected-accounts E2E tests.
 */
export const getConnectedNetworkPickerAccessibilityLabel = (
  siteTitle: string,
  networkName: string,
): string => {
  const siteLetter = siteTitle.charAt(0);
  const networkLetter = networkName.charAt(0);
  return `${siteLetter}, ${networkLetter}`;
};

const renderDappAvatar = (
  faviconImageSource: ReturnType<typeof resolvePageFaviconImageSource>,
  iconTitle: string,
  showTokenFallback: boolean,
) => {
  if (faviconImageSource) {
    return (
      <AvatarFavicon
        src={faviconImageSource}
        size={AvatarFaviconSize.Md}
        name={iconTitle}
      />
    );
  }

  if (showTokenFallback) {
    return <AvatarToken name={iconTitle} size={AvatarTokenSize.Md} />;
  }

  return <AvatarIcon iconName={IconName.Global} size={AvatarIconSize.Md} />;
};

const PermissionsSummaryTopIcon = ({
  currentPageInformation,
  isAlreadyConnected = false,
  showPermissionsOnly = false,
  networkName,
  networkImageSource,
  onSwitchNetwork,
  containerStyle,
}: PermissionsSummaryTopIconProps) => {
  const { currentEnsName, url, icon } = currentPageInformation;
  const iconTitle = getHost(currentEnsName || url);
  const faviconImageSource = resolvePageFaviconImageSource(icon);
  const showConnectedLayout = isAlreadyConnected && !showPermissionsOnly;
  const connectedNetworkPickerAccessibilityLabel =
    getConnectedNetworkPickerAccessibilityLabel(iconTitle, networkName);

  return (
    <View style={containerStyle}>
      {showConnectedLayout ? (
        <Pressable
          onPress={onSwitchNetwork}
          testID={ConnectedAccountsSelectorsIDs.NETWORK_PICKER}
          accessible
          accessibilityRole="button"
          accessibilityLabel={connectedNetworkPickerAccessibilityLabel}
        >
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <BadgeWrapper
              badge={
                <BadgeNetwork name={networkName} src={networkImageSource} />
              }
            >
              {renderDappAvatar(faviconImageSource, iconTitle, true)}
            </BadgeWrapper>
          </View>
        </Pressable>
      ) : (
        renderDappAvatar(faviconImageSource, iconTitle, false)
      )}
    </View>
  );
};

export default PermissionsSummaryTopIcon;
