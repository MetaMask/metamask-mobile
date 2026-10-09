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
      />
    </BadgeWrapper>
  );
};

export interface WalletHeaderInterimActionsProps
  extends WalletHeaderMenuButtonProps {
  isMoneyAccountVisible: boolean;
  handleActivityPress: () => void;
  handleSearchPress: () => void;
  twClassName?: string;
}

/** Activity (where Money is available), Search and Menu, in one tight row. */
const WalletHeaderInterimActions = ({
  isMoneyAccountVisible,
  handleActivityPress,
  handleSearchPress,
  handleHamburgerPress,
  touchAreaSlop,
  twClassName = '',
}: WalletHeaderInterimActionsProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName={`gap-2 ${twClassName}`}
  >
    {isMoneyAccountVisible && (
      <ButtonIcon
        iconProps={{ color: MMDSIconColor.IconDefault }}
        onPress={handleActivityPress}
        iconName={MMDSIconName.Clock}
        size={ButtonIconSize.Md}
        testID={WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON}
        accessibilityLabel={strings('activity_view.title')}
        hitSlop={touchAreaSlop}
      />
    )}
    <ButtonIcon
      iconProps={{ color: MMDSIconColor.IconDefault }}
      onPress={() => handleSearchPress()}
      iconName={MMDSIconName.Search}
      size={ButtonIconSize.Md}
      testID={WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON}
      accessibilityLabel={strings('wallet.search_accessibility_label')}
      hitSlop={touchAreaSlop}
    />
    <WalletHeaderMenuButton
      handleHamburgerPress={handleHamburgerPress}
      touchAreaSlop={touchAreaSlop}
    />
  </Box>
);

export default WalletHeaderInterimActions;
