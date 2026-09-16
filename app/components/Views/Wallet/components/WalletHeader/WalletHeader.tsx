import React, { memo, useCallback } from 'react';
import { View, type ViewStyle } from 'react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
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
import PickerAccount from '../../../../../component-library/components/Pickers/PickerAccount';
import AddressCopy from '../../../../UI/AddressCopy';
import CardButton from '../../../../UI/Card/components/CardButton';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { createAccountSelectorNavDetails } from '../../../AccountSelector';
import { useAccountsMenuAttention } from '../../../../hooks/useAccountsMenuAttention';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';

interface TouchAreaSlop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const accountPickerContainerStyle: ViewStyle = { flex: 1 };

export interface WalletHeaderProps {
  displayName: string;
  navigation: NavigationProp<ParamListBase>;
  isMoneyAccountVisible: boolean;
  handleSearchPress: () => void;
  handleActivityPress: () => void;
  handleCardPress: () => void;
  handleHamburgerPress: () => void;
  touchAreaSlop: TouchAreaSlop;
  headerActionButtonsContainerStyle: ViewStyle;
  headerAccountPickerStyle: ViewStyle;
}

/**
 * Wallet home screen header: account picker plus the search/activity/copy/
 * card/menu action buttons. Memoized so `Wallet` re-renders (e.g. on
 * navigation focus) skip this subtree unless its props or the Accounts menu
 * attention hook change.
 */
const WalletHeader = ({
  displayName,
  navigation,
  isMoneyAccountVisible,
  handleSearchPress,
  handleActivityPress,
  handleCardPress,
  handleHamburgerPress,
  touchAreaSlop,
  headerActionButtonsContainerStyle,
  headerAccountPickerStyle,
}: WalletHeaderProps) => {
  const hasAccountsMenuAttention = useAccountsMenuAttention();

  const handleAccountPickerPress = useCallback(() => {
    navigation.navigate(...createAccountSelectorNavDetails({}));
  }, [navigation]);

  return (
    <HeaderRoot
      testID={WalletViewSelectorsIDs.WALLET_HEADER_ROOT}
      endAccessory={
        <View style={headerActionButtonsContainerStyle} accessible={false}>
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
          {isMoneyAccountVisible && (
            <ButtonIcon
              iconProps={{
                color: MMDSIconColor.IconDefault,
              }}
              onPress={handleActivityPress}
              iconName={MMDSIconName.Clock}
              size={ButtonIconSize.Md}
              testID={WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON}
              hitSlop={touchAreaSlop}
            />
          )}
          <AddressCopy
            testID={WalletViewSelectorsIDs.NAVBAR_ADDRESS_COPY_BUTTON}
            hitSlop={touchAreaSlop}
          />
          {!isMoneyAccountVisible && (
            <CardButton
              onPress={handleCardPress}
              touchAreaSlop={touchAreaSlop}
            />
          )}
          <BadgeWrapper
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
              iconProps={{
                color: MMDSIconColor.IconDefault,
              }}
              onPress={handleHamburgerPress}
              iconName={MMDSIconName.Menu}
              size={ButtonIconSize.Md}
              testID={WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON}
              hitSlop={touchAreaSlop}
            />
          </BadgeWrapper>
        </View>
      }
      twClassName="pl-1 pr-3"
    >
      {/* `HeaderRoot` doesn't shrink `children` like the old deprecated
          version did, so the account picker needs its own flex-1 wrapper
          to make room for the action buttons on narrow screens. */}
      <View style={accountPickerContainerStyle}>
        <PickerAccount
          accountName={displayName}
          onPress={handleAccountPickerPress}
          testID={WalletViewSelectorsIDs.ACCOUNT_ICON}
          hitSlop={touchAreaSlop}
          style={headerAccountPickerStyle}
        />
      </View>
    </HeaderRoot>
  );
};

export default memo(WalletHeader);
