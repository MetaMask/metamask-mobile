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
import { isNotificationsFeatureEnabled } from '../../../../../util/notifications';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';

interface TouchAreaSlop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const accountPickerContainerStyle: ViewStyle = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
};

const headerActionsContainerStyle: ViewStyle = {
  flexShrink: 0,
};

export interface WalletHeaderProps {
  displayName: string;
  navigation: NavigationProp<ParamListBase>;
  isMoneyAccountVisible: boolean;
  isNotificationEnabled: boolean;
  unreadNotificationCount: number;
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
 * card/notifications action buttons. Extracted into its own memoized
 * component so this subtree doesn't re-render every time `Wallet` re-renders
 * (e.g. on navigation focus) — none of these buttons depend on anything that
 * changes that often.
 */
const WalletHeader = ({
  displayName,
  navigation,
  isMoneyAccountVisible,
  isNotificationEnabled,
  unreadNotificationCount,
  handleSearchPress,
  handleActivityPress,
  handleCardPress,
  handleHamburgerPress,
  touchAreaSlop,
  headerActionButtonsContainerStyle,
  headerAccountPickerStyle,
}: WalletHeaderProps) => {
  const handleAccountPickerPress = useCallback(() => {
    navigation.navigate(...createAccountSelectorNavDetails({}));
  }, [navigation]);

  return (
    <HeaderRoot
      testID={WalletViewSelectorsIDs.WALLET_HEADER_ROOT}
      endAccessory={
        <View
          style={[
            headerActionButtonsContainerStyle,
            headerActionsContainerStyle,
          ]}
          accessible={false}
        >
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
          {isNotificationsFeatureEnabled() ? (
            <BadgeWrapper
              position={BadgeWrapperPosition.TopRight}
              positionAnchorShape={BadgeWrapperPositionAnchorShape.Circular}
              badge={
                isNotificationEnabled && unreadNotificationCount > 0 ? (
                  <BadgeStatus status={BadgeStatusStatus.Attention} />
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
          ) : (
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
          )}
        </View>
      }
      twClassName="pl-1 pr-3"
    >
      {/* `HeaderRoot` doesn't shrink `children` like the old deprecated
          version did. The picker wrapper must flex and allow shrinking
          below the account name's intrinsic width (`minWidth: 0`) so
          long names truncate instead of pushing action buttons off-screen. */}
      <View
        style={accountPickerContainerStyle}
        testID={WalletViewSelectorsIDs.ACCOUNT_PICKER_CONTAINER}
      >
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
