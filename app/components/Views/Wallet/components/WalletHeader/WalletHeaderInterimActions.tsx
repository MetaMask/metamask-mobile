import React from 'react';
import {
  BadgeStatus,
  BadgeStatusStatus,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  IconColor as MMDSIconColor,
  IconName as MMDSIconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useAccountsMenuAttention } from '../../../../hooks/useAccountsMenuAttention';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';

interface TouchAreaSlop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface WalletHeaderMenuButtonProps {
  handleHamburgerPress: () => void;
  touchAreaSlop: TouchAreaSlop;
}

/** Header icons sit on glass; the default press fill covers that material. */
const HEADER_ICON_BUTTON_CLASS = 'bg-transparent';

export const WalletHeaderMenuButton = ({
  handleHamburgerPress,
  touchAreaSlop,
}: WalletHeaderMenuButtonProps) => {
  const hasAccountsMenuAttention = useAccountsMenuAttention();

  return (
    <BadgeWrapper
      // BadgeWrapper defaults to `self-start`, which top-aligns it in a row.
      twClassName="self-center"
      position={BadgeWrapperPosition.TopRight}
      positionAnchorShape={BadgeWrapperPositionAnchorShape.Circular}
      badge={
        hasAccountsMenuAttention ? (
          <BadgeStatus
            status={BadgeStatusStatus.Attention}
            twClassName="-translate-x-1 translate-y-1 border-transparent"
            testID={WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BADGE}
          />
        ) : null
      }
    >
      <ButtonIcon
        iconProps={{ color: MMDSIconColor.IconDefault }}
        onPress={handleHamburgerPress}
        iconName={MMDSIconName.Menu}
        size={ButtonIconSize.Md}
        testID={WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON}
        hitSlop={touchAreaSlop}
        twClassName={HEADER_ICON_BUTTON_CLASS}
      />
    </BadgeWrapper>
  );
};

export interface WalletHeaderInterimActionsProps
  extends WalletHeaderMenuButtonProps {
  isMoneyAccountVisible: boolean;
  handleActivityPress: () => void;
  handleSearchPress: () => void;
  handleRewardsPress?: () => void;
  isSocialLayout?: boolean;
  twClassName?: string;
}

/** Search, Activity/Rewards and Menu, in one tight row. */
const WalletHeaderInterimActions = ({
  isMoneyAccountVisible,
  handleActivityPress,
  handleSearchPress,
  handleRewardsPress,
  handleHamburgerPress,
  touchAreaSlop,
  isSocialLayout = false,
  twClassName = '',
}: WalletHeaderInterimActionsProps) => {
  let secondaryAction: React.ReactNode = null;

  if (isSocialLayout) {
    secondaryAction = (
      <ButtonIcon
        iconProps={{ color: MMDSIconColor.IconDefault }}
        onPress={handleRewardsPress}
        iconName={MMDSIconName.Gift}
        size={ButtonIconSize.Md}
        testID={WalletViewSelectorsIDs.WALLET_REWARDS_BUTTON}
        accessibilityLabel={strings('wallet.rewards_accessibility_label')}
        hitSlop={touchAreaSlop}
        twClassName={HEADER_ICON_BUTTON_CLASS}
      />
    );
  } else if (isMoneyAccountVisible) {
    secondaryAction = (
      <ButtonIcon
        iconProps={{ color: MMDSIconColor.IconDefault }}
        onPress={handleActivityPress}
        iconName={MMDSIconName.Clock}
        size={ButtonIconSize.Md}
        testID={WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON}
        accessibilityLabel={strings('activity_view.title')}
        hitSlop={touchAreaSlop}
        twClassName={HEADER_ICON_BUTTON_CLASS}
      />
    );
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName={`gap-2 ${twClassName}`}
    >
      <ButtonIcon
        iconProps={{ color: MMDSIconColor.IconDefault }}
        onPress={() => handleSearchPress()}
        iconName={MMDSIconName.Search}
        size={ButtonIconSize.Md}
        testID={WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON}
        accessibilityLabel={strings('wallet.search_accessibility_label')}
        hitSlop={touchAreaSlop}
        twClassName={HEADER_ICON_BUTTON_CLASS}
      />
      {secondaryAction}
      {!isSocialLayout ? (
        <WalletHeaderMenuButton
          handleHamburgerPress={handleHamburgerPress}
          touchAreaSlop={touchAreaSlop}
        />
      ) : null}
    </Box>
  );
};

export default WalletHeaderInterimActions;
