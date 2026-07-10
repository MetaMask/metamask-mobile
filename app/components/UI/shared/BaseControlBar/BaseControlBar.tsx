import React, { useCallback, ReactNode, useMemo, useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { SolScope } from '@metamask/keyring-api';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  SelectButton,
  SelectButtonVariant,
  ButtonIcon,
  ButtonIconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { selectNetworkName } from '../../../../selectors/networkInfos';
import { getNetworkImageSource } from '../../../../util/networks';
import { createTokensBottomSheetNavDetails } from '../../Tokens/TokenSortBottomSheet/TokenSortBottomSheet';
import { createNetworkManagerNavDetails } from '../../NetworkManager';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import {
  NetworkType,
  useNetworksByCustomNamespace,
} from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useStyles } from '../../../hooks/useStyles';
import createControlBarStyles from '../ControlBarStyles';
import { KnownCaipNamespace } from '@metamask/utils';
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
   * Custom handler for filter controls (overrides default behavior)
   */
  onFilterPress?: () => void;
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
}) => {
  const { styles } = useStyles(createControlBarStyles, undefined);
  const navigation = useNavigation();

  // Shared selectors
  const networkName = useSelector(selectNetworkName);

  const selectedSolanaAccount =
    useSelector(selectSelectedInternalAccountByScope)(SolScope.Mainnet) || null;

  // Shared hooks
  const { enabledNetworks, getNetworkInfo } = useCurrentNetworkInfo();

  const { enableAllPopularNetworks } = useNetworkEnablement();
  const { areAllNetworksSelected, totalEnabledNetworksCount } =
    useNetworksByCustomNamespace({
      networkType: NetworkType.Popular,
      namespace: KnownCaipNamespace.Eip155,
    });

  const currentNetworkName = getNetworkInfo(0)?.networkName;
  const currentNetworkCaipChainId = getNetworkInfo(0)?.caipChainId;

  useEffect(() => {
    if (
      !selectedSolanaAccount &&
      enabledNetworks.length === 1 &&
      enabledNetworks[0].chainId === SolScope.Mainnet
    ) {
      enableAllPopularNetworks();
    }
  }, [
    currentNetworkName,
    enabledNetworks,
    selectedSolanaAccount,
    enableAllPopularNetworks,
  ]);

  // Determine if disabled based on context
  const isDisabled = useMemo(() => {
    // If custom disabled logic is provided, respect it
    if (customIsDisabled !== undefined) {
      return customIsDisabled;
    }

    return false;
  }, [customIsDisabled]);

  const displayAllNetworks = totalEnabledNetworksCount > 1;
  const showNetworkFilterAvatar =
    !displayAllNetworks && !areAllNetworksSelected;

  // Shared navigation handlers
  const defaultHandleFilterControls = useCallback(() => {
    navigation.navigate(...createNetworkManagerNavDetails({}));
  }, [navigation]);

  const defaultShowSortControls = useCallback(() => {
    navigation.navigate(...createTokensBottomSheetNavDetails({}));
  }, [navigation]);

  // Use custom handlers if provided, otherwise use defaults
  const handleFilterControls = onFilterPress || defaultHandleFilterControls;
  const handleSortControls = onSortPress || defaultShowSortControls;

  // Shared network image logic
  const firstEnabledChainId = enabledNetworks[0]?.chainId || '';
  const networkImageSource = getNetworkImageSource({
    chainId: firstEnabledChainId,
  });

  const networkLabelValue = useMemo(
    () =>
      displayAllNetworks
        ? strings('wallet.popular_networks')
        : (currentNetworkName ?? strings('wallet.current_network')),
    [displayAllNetworks, currentNetworkName],
  );

  const networkStartAccessory = useMemo(
    () =>
      showNetworkFilterAvatar ? (
        <AvatarNetwork
          src={networkImageSource}
          size={AvatarNetworkSize.Xs}
          name={networkName}
        />
      ) : undefined,
    [showNetworkFilterAvatar, networkImageSource, networkName],
  );

  const networkButton = (
    <SelectButton
      testID={networkFilterTestId}
      variant={SelectButtonVariant.Primary}
      placeholder={strings('wallet.current_network')}
      value={networkLabelValue}
      startAccessory={networkStartAccessory}
      textProps={{
        numberOfLines: 1,
        testID: `${networkFilterTestId}-${currentNetworkCaipChainId}`,
      }}
      isDisabled={isDisabled}
      onPress={handleFilterControls}
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
