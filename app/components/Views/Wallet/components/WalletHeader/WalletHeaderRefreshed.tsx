import React, { memo } from 'react';
import { TouchableOpacity, View, type ViewStyle } from 'react-native';
import {
  AvatarAccount,
  AvatarAccountSize,
  BadgeStatus,
  BadgeStatusStatus,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
  ButtonIcon,
  ButtonIconSize,
  HeaderRoot,
  IconColor as MMDSIconColor,
  IconName as MMDSIconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  getAvatarAccountVariant,
  type AccountAvatarVariant,
} from '../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { isNotificationsFeatureEnabled } from '../../../../../util/notifications';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';

interface TouchAreaSlop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface WalletHeaderRefreshedProps {
  accountAddress: string;
  avatarAccountType: AccountAvatarVariant;
  displayName: string;
  isNotificationEnabled: boolean;
  unreadNotificationCount: number;
  handleRewardsPress: () => void;
  handleAccountHubPress: () => void;
  touchAreaSlop: TouchAreaSlop;
  headerActionButtonsContainerStyle: ViewStyle;
}

/**
 * Treatment header for the Header & NavBar refresh experiment (TMCU-1276):
 * just the account avatar (opens the Accounts & Settings screen) and a
 * rewards entry point. The unread-notification dot moves onto the avatar
 * because the treatment removes the hamburger that carried it. Memoized for
 * the same reason as the control `WalletHeader`.
 */
const WalletHeaderRefreshed = ({
  accountAddress,
  avatarAccountType,
  displayName,
  isNotificationEnabled,
  unreadNotificationCount,
  handleRewardsPress,
  handleAccountHubPress,
  touchAreaSlop,
  headerActionButtonsContainerStyle,
}: WalletHeaderRefreshedProps) => (
  <HeaderRoot
    testID={WalletViewSelectorsIDs.WALLET_HEADER_ROOT}
    endAccessory={
      <View style={headerActionButtonsContainerStyle} accessible={false}>
        <ButtonIcon
          iconProps={{
            color: MMDSIconColor.IconDefault,
          }}
          onPress={handleRewardsPress}
          iconName={MMDSIconName.Gift}
          size={ButtonIconSize.Md}
          testID={WalletViewSelectorsIDs.WALLET_REWARDS_BUTTON}
          accessibilityLabel={strings('wallet.rewards_accessibility_label')}
          hitSlop={touchAreaSlop}
        />
      </View>
    }
    twClassName="pl-4 pr-4"
  >
    <TouchableOpacity
      onPress={handleAccountHubPress}
      testID={WalletViewSelectorsIDs.WALLET_ACCOUNT_HUB_BUTTON}
      hitSlop={touchAreaSlop}
      accessibilityRole="button"
      accessibilityLabel={displayName}
    >
      <BadgeWrapper
        position={BadgeWrapperPosition.BottomRight}
        positionAnchorShape={BadgeWrapperPositionAnchorShape.Circular}
        badge={
          isNotificationsFeatureEnabled() &&
          isNotificationEnabled &&
          unreadNotificationCount > 0 ? (
            <BadgeStatus status={BadgeStatusStatus.Attention} />
          ) : null
        }
      >
        <AvatarAccount
          address={accountAddress}
          variant={getAvatarAccountVariant(avatarAccountType)}
          size={AvatarAccountSize.Md}
        />
      </BadgeWrapper>
    </TouchableOpacity>
  </HeaderRoot>
);

export default memo(WalletHeaderRefreshed);
