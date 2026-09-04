import React, { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { View, ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { SolScope } from '@metamask/keyring-api';
import {
  SelectButton,
  SelectButtonVariant,
  ButtonIcon,
  ButtonIconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { createTokensBottomSheetNavDetails } from '../../Tokens/TokenSortBottomSheet/TokenSortBottomSheet';
import { navigateWithDetails } from '../../../../util/navigation/navUtils';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import { useStyles } from '../../../hooks/useStyles';
import createControlBarStyles from '../ControlBarStyles';
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { useNetworkEnablement } from '../../../hooks/useNetworkEnablement/useNetworkEnablement';

export interface BaseControlBarProps {
  /**
   * Test ID for the network filter button
   */
  networkFilterTestId: string;
  /**
   * Custom condition to determine if the control bar should be disabled
   */
  isDisabled?: boolean;
  /**
   * Opens the network filter (typically the NetworkManager, scoped to the
   * caller's own local filter state).
   */
  onFilterPress: () => void;
  /**
   * Custom handler for sort controls (overrides default behavior)
   */
  onSortPress?: () => void;
  /**
   * Whether to show the sort button
   */
  hideSort?: boolean;
  /**
   * Additional action buttons to render (e.g., Add Token button)
   */
  additionalButtons?: ReactNode;
  /**
   * Custom wrapper component for the control buttons
   */
  customWrapper?: 'outer' | 'none';
  /**
   * Custom style to apply to the action bar wrapper
   */
  style?: ViewStyle;
  /**
   * The network filter button's label.
   */
  networkLabel: string;
  /**
   * The network filter button's start accessory (avatar). Pass `null` to
   * render no accessory.
   */
  networkAvatar: ReactNode | null;
  /**
   * Optional testID for the network filter button's value text, e.g. to
   * expose the currently-selected chain ID to e2e tests.
   */
  networkValueTestId?: string;
}

const BaseControlBar: React.FC<BaseControlBarProps> = ({
  networkFilterTestId,
  isDisabled: customIsDisabled,
  onFilterPress,
  onSortPress,
  hideSort = false,
  additionalButtons,
  customWrapper = 'outer',
  style,
  networkLabel,
  networkAvatar,
  networkValueTestId,
}) => {
  const { styles } = useStyles(createControlBarStyles, undefined);
  const navigation = useNavigation<AppNavigationProp>();

  const selectedSolanaAccount =
    useSelector(selectSelectedInternalAccountByScope)(SolScope.Mainnet) || null;

  // Shared hooks
  const { enabledNetworks } = useCurrentNetworkInfo();
  const { enableAllPopularNetworks } = useNetworkEnablement();

  // Safety net: NetworkEnablementController should never be left with only
  // Solana enabled while no Solana account is selected.
  useEffect(() => {
    if (
      !selectedSolanaAccount &&
      enabledNetworks.length === 1 &&
      enabledNetworks[0].chainId === SolScope.Mainnet
    ) {
      enableAllPopularNetworks();
    }
  }, [enabledNetworks, selectedSolanaAccount, enableAllPopularNetworks]);

  // Determine if disabled based on context
  const isDisabled = useMemo(() => {
    // If custom disabled logic is provided, respect it
    if (customIsDisabled !== undefined) {
      return customIsDisabled;
    }

    return false;
  }, [customIsDisabled]);

  const defaultShowSortControls = useCallback(() => {
    navigateWithDetails(navigation, createTokensBottomSheetNavDetails({}));
  }, [navigation]);

  const handleSortControls = onSortPress || defaultShowSortControls;

  const networkButton = (
    <SelectButton
      testID={networkFilterTestId}
      variant={SelectButtonVariant.Primary}
      placeholder={strings('wallet.current_network')}
      value={networkLabel}
      startAccessory={networkAvatar ?? undefined}
      textProps={{
        numberOfLines: 1,
        testID: networkValueTestId,
      }}
      isDisabled={isDisabled}
      onPress={onFilterPress}
    />
  );

  const sortButton = !hideSort && (
    <ButtonIcon
      testID={WalletViewSelectorsIDs.SORT_BUTTON}
      size={ButtonIconSize.Md}
      onPress={handleSortControls}
      iconName={IconName.Filter}
    />
  );

  if (customWrapper === 'none') {
    return (
      <View style={[styles.actionBarWrapper, style]}>
        {networkButton}
        {sortButton}
        {additionalButtons}
      </View>
    );
  }

  return (
    <View style={[styles.actionBarWrapper, style]}>
      <View style={styles.controlButtonOuterWrapper}>
        {networkButton}
        <View style={styles.controlButtonInnerWrapper}>
          {sortButton}
          {additionalButtons}
        </View>
      </View>
    </View>
  );
};

export default BaseControlBar;
