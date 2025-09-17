import React, { useCallback, ReactNode } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
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
import {
  selectIsAllNetworks,
  selectIsPopularNetwork,
} from '../../../../selectors/networkController';
import { selectNetworkName } from '../../../../selectors/networkInfos';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
import {
  isRemoveGlobalNetworkSelectorEnabled,
  getNetworkImageSource,
} from '../../../../util/networks';
import {
  createTokenBottomSheetFilterNavDetails,
  createTokensBottomSheetNavDetails,
} from '../../Tokens/TokensBottomSheet';
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
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { NetworkManagerSelectorIDs } from '../../../../../e2e/selectors/wallet/NetworkManager.selectors';

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
}

const BaseControlBar: React.FC<BaseControlBarProps> = ({
  networkFilterTestId,
  isDisabled: customIsDisabled,
  onFilterPress,
  onSortPress,
  additionalButtons,
  useEvmSelectionLogic = false,
  customWrapper = 'outer',
}) => {
  const { styles } = useStyles(createControlBarStyles, undefined);
  const navigation = useNavigation();

  // Shared selectors
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isAllPopularEVMNetworks = useSelector(selectIsPopularNetwork);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const networkName = useSelector(selectNetworkName);
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  // Shared hooks
  const {
    enabledNetworks,
    getNetworkInfo,
    isDisabled: hookIsDisabled,
  } = useCurrentNetworkInfo();
  const { areAllNetworksSelected, totalEnabledNetworksCount } =
    useNetworksByCustomNamespace({
      networkType: NetworkType.Popular,
      namespace: KnownCaipNamespace.Eip155,
    });

  const currentNetworkName = getNetworkInfo(0)?.networkName;
  const currentNetworkCaipChainId = getNetworkInfo(0)?.caipChainId;

  // Determine if disabled (use custom logic if provided, otherwise use hook logic)
  const isDisabled = customIsDisabled ?? hookIsDisabled;

  const displayAllNetworks = isMultichainAccountsState2Enabled
    ? totalEnabledNetworksCount > 1
    : enabledNetworks.length > 1;

  // Shared navigation handlers
  const defaultHandleFilterControls = useCallback(() => {
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      navigation.navigate(...createNetworkManagerNavDetails({}));
    } else if (useEvmSelectionLogic && isEvmSelected) {
      navigation.navigate(...createTokenBottomSheetFilterNavDetails({}));
    } else if (!useEvmSelectionLogic) {
      navigation.navigate(...createTokenBottomSheetFilterNavDetails({}));
    }
  }, [navigation, isEvmSelected, useEvmSelectionLogic]);

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
    <>
      {isRemoveGlobalNetworkSelectorEnabled() ? (
        <View style={styles.networkManagerWrapper}>
          {!areAllNetworksSelected && (
            <Avatar
              variant={AvatarVariant.Network}
              size={AvatarSize.Xs}
              name={networkName}
              imageSource={networkImageSource}
            />
          )}
          <TextComponent
            variant={TextVariant.BodyMDMedium}
            style={styles.controlButtonText}
            numberOfLines={1}
            testID={`${NetworkManagerSelectorIDs.BASE_CONTROL_BAR_NETWORK_LABEL}-${currentNetworkCaipChainId}`}
          >
            {displayAllNetworks
              ? strings('wallet.all_networks')
              : currentNetworkName ?? strings('wallet.current_network')}
          </TextComponent>
        </View>
      ) : (
        <TextComponent
          variant={TextVariant.BodyMDMedium}
          style={styles.controlButtonText}
          numberOfLines={1}
        >
          {isAllNetworks && isAllPopularEVMNetworks && isEvmSelected
            ? strings('wallet.popular_networks')
            : networkName ?? strings('wallet.current_network')}
        </TextComponent>
      )}
    </>
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
    />
  );

  const sortButton = (
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
      <View style={styles.actionBarWrapper}>
        {networkButton}
        {sortButton}
        {additionalButtons}
      </View>
    );
  }

  return (
    <View style={styles.actionBarWrapper}>
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
