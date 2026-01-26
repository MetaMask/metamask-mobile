import React, { useCallback, ReactNode, useMemo, useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { SolScope } from '@metamask/keyring-api';
import { strings } from '../../../../../locales/i18n';
import ButtonBase from '../../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import TextComponent, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { selectNetworkName } from '../../../../selectors/networkInfos';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
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
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts';
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
   * Whether to show the EVM selection logic for filter handling
   */
  useEvmSelectionLogic?: boolean;
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
  useEvmSelectionLogic = false,
  customWrapper = 'outer',
  style,
}) => {
  const { styles } = useStyles(createControlBarStyles, undefined);
  const navigation = useNavigation();

  // Shared selectors
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const networkName = useSelector(selectNetworkName);
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const selectedSolanaAccount =
    useSelector(selectSelectedInternalAccountByScope)(SolScope.Mainnet) || null;

  // Shared hooks
  const {
    enabledNetworks,
    getNetworkInfo,
    isDisabled: hookIsDisabled,
  } = useCurrentNetworkInfo();

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

    // If multichain accounts state 2 is enabled, enable the button
    if (isMultichainAccountsState2Enabled) {
      return false;
    }

    // Otherwise, use the hook's logic
    return hookIsDisabled;
  }, [customIsDisabled, isMultichainAccountsState2Enabled, hookIsDisabled]);

  const displayAllNetworks = isMultichainAccountsState2Enabled
    ? totalEnabledNetworksCount > 1
    : enabledNetworks.length > 1;

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

  // Shared network label rendering
  const renderNetworkLabel = () => (
    <View style={styles.networkManagerWrapper}>
      {!areAllNetworksSelected && (
        <View style={styles.networkAvatarWrapper}>
          <Avatar
            variant={AvatarVariant.Network}
            size={AvatarSize.Xs}
            name={networkName}
            imageSource={networkImageSource}
          />
        </View>
      )}
      <TextComponent
        variant={TextVariant.BodyMDMedium}
        style={styles.controlButtonText}
        numberOfLines={1}
        testID={`${networkFilterTestId}-${currentNetworkCaipChainId}`}
      >
        {displayAllNetworks
          ? strings('wallet.popular_networks')
          : (currentNetworkName ?? strings('wallet.current_network'))}
      </TextComponent>
    </View>
  );

  const networkButton = (
    <ButtonBase
      testID={networkFilterTestId}
      label={renderNetworkLabel()}
      isDisabled={isDisabled}
      onPress={
        useEvmSelectionLogic &&
        !isEvmSelected &&
        !isMultichainAccountsState2Enabled
          ? () => null
          : handleFilterControls
      }
      endIconName={
        useEvmSelectionLogic &&
        !isEvmSelected &&
        !isMultichainAccountsState2Enabled
          ? undefined
          : IconName.ArrowDown
      }
      style={isDisabled ? styles.controlButtonDisabled : styles.controlButton}
      disabled={isDisabled}
      activeOpacity={0.2}
    />
  );

  const sortButton = !hideSort && (
    <ButtonIcon
      testID={WalletViewSelectorsIDs.SORT_BUTTON}
      size={ButtonIconSizes.Lg}
      onPress={handleSortControls}
      iconName={IconName.Filter}
      style={styles.controlIconButton}
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
