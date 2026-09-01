import React, { memo } from 'react';
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
  BoxAlignItems,
  BoxFlexDirection,
  ButtonAnimated,
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
import { useHasUnreadNotifications } from '../../../../hooks/useHasUnreadNotifications';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';

interface TouchAreaSlop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface WalletHeaderCompactProps {
  accountAddress: string;
  avatarAccountType: AccountAvatarVariant;
  displayName: string;
  handleRewardsPress: () => void;
  handleAccountHubPress: () => void;
  touchAreaSlop: TouchAreaSlop;
  scrollY: SharedValue<number>;
  titleSectionHeight: SharedValue<number>;
  /** Set when the NavBar's trailing button opens the trade tray instead of search. */
  handleSearchPress?: () => void;
}

const WalletHeaderCompact = ({
  accountAddress,
  avatarAccountType,
  displayName,
  handleRewardsPress,
  handleAccountHubPress,
  touchAreaSlop,
  scrollY,
  titleSectionHeight,
  handleSearchPress,
}: WalletHeaderCompactProps) => {
  const hasUnreadNotifications = useHasUnreadNotifications();

  return (
    <HeaderStandardAnimated
      testID={WalletViewSelectorsIDs.WALLET_HEADER_ROOT}
      title={displayName}
      titleProps={{ numberOfLines: 1 }}
      scrollY={scrollY}
      titleSectionHeight={titleSectionHeight}
      startAccessory={
        <ButtonAnimated
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
              hasUnreadNotifications ? (
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
        </ButtonAnimated>
      }
      endAccessory={
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
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
          {handleSearchPress ? (
            <ButtonIcon
              iconProps={{
                color: MMDSIconColor.IconDefault,
              }}
              onPress={handleSearchPress}
              iconName={MMDSIconName.Search}
              size={ButtonIconSize.Md}
              testID={WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON}
              accessibilityLabel={strings('wallet.search_accessibility_label')}
              hitSlop={touchAreaSlop}
            />
          ) : null}
        </Box>
      }
      twClassName="pl-4 pr-3"
    />
  );
};

export default memo(WalletHeaderCompact);
