import React, { memo } from 'react';
import { TouchableOpacity } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarBaseShape,
  BadgeStatus,
  BadgeStatusStatus,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
  Box,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  HeaderStandardAnimated,
  IconColor as MMDSIconColor,
  IconName as MMDSIconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  getAvatarAccountVariant,
  type AccountAvatarVariant,
} from '../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import {
  isNotificationsFeatureEnabled,
  shortenString,
} from '../../../../../util/notifications';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';

interface TouchAreaSlop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const HEADER_TITLE_CHAR_LIMIT = 20;

export interface WalletHeaderCompactProps {
  accountAddress: string;
  avatarAccountType: AccountAvatarVariant;
  displayName: string;
  isNotificationEnabled: boolean;
  unreadNotificationCount: number;
  handleRewardsPress: () => void;
  handleAccountHubPress: () => void;
  touchAreaSlop: TouchAreaSlop;
  /** Scroll offset of the homepage scroll view. */
  scrollY: SharedValue<number>;
  /** Offset past which the in-content account name is fully scrolled away. */
  titleSectionHeight: SharedValue<number>;
}

/**
 * Treatment header for the Header & NavBar refresh experiment (TMCU-1276):
 * the account avatar (opens the Accounts & Settings screen) and a rewards
 * entry point. The account name lives in the scroll content; once it scrolls
 * out of view, a compact copy fades into the header center (same pattern as
 * the Activity screen). The unread-notification dot moves onto the avatar
 * because the treatment removes the hamburger that carried it. Memoized for
 * the same reason as the control `WalletHeader`.
 */
const WalletHeaderCompact = ({
  accountAddress,
  avatarAccountType,
  displayName,
  isNotificationEnabled,
  unreadNotificationCount,
  handleRewardsPress,
  handleAccountHubPress,
  touchAreaSlop,
  scrollY,
  titleSectionHeight,
}: WalletHeaderCompactProps) => (
  <HeaderStandardAnimated
    testID={WalletViewSelectorsIDs.WALLET_HEADER_ROOT}
    title={shortenString(displayName, {
      truncatedCharLimit: HEADER_TITLE_CHAR_LIMIT,
      truncatedStartChars: HEADER_TITLE_CHAR_LIMIT - 3,
      skipCharacterInEnd: true,
    })}
    titleProps={{ numberOfLines: 1 }}
    scrollY={scrollY}
    titleSectionHeight={titleSectionHeight}
    startAccessory={
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
            size={AvatarAccountSize.Lg}
            shape={AvatarBaseShape.Circle}
          />
        </BadgeWrapper>
      </TouchableOpacity>
    }
    endAccessory={
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="gap-2"
        accessible={false}
      >
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
      </Box>
    }
    twClassName="pl-4 pr-4"
  />
);

export default memo(WalletHeaderCompact);
