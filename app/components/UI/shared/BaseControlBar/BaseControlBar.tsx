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
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import {
  useNetworksByNamespace,
  NetworkType,
} from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useStyles } from '../../../hooks/useStyles';
import createControlBarStyles from '../ControlBarStyles';
import { NavigatableRootParamList } from '../../../../util/navigation';
import { StackNavigationProp } from '@react-navigation/stack';

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
  const navigation =
    useNavigation<StackNavigationProp<NavigatableRootParamList>>();

  // Shared selectors
  const isAllNetworks = useSelector(selectIsAllNetworks);
  const isAllPopularEVMNetworks = useSelector(selectIsPopularNetwork);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const networkName = useSelector(selectNetworkName);

  // Shared hooks
  const {
    enabledNetworks,
    getNetworkInfo,
    isDisabled: hookIsDisabled,
  } = useCurrentNetworkInfo();
  const { areAllNetworksSelected } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });

  const currentNetworkName = getNetworkInfo(0)?.networkName;

  // Determine if disabled (use custom logic if provided, otherwise use hook logic)
  const isDisabled = customIsDisabled ?? hookIsDisabled;

  // Shared navigation handlers
  const defaultHandleFilterControls = useCallback(() => {
    if (isRemoveGlobalNetworkSelectorEnabled()) {
      navigation.navigate('RootModalFlow', {
        screen: 'NetworkManager',
      });
    } else if (useEvmSelectionLogic && isEvmSelected) {
      navigation.navigate('RootModalFlow', { screen: 'TokenFilter' });
    } else if (!useEvmSelectionLogic) {
      navigation.navigate('RootModalFlow', { screen: 'TokenFilter' });
    }
  }, [navigation, isEvmSelected, useEvmSelectionLogic]);

  const defaultShowSortControls = useCallback(() => {
    navigation.navigate('RootModalFlow', { screen: 'TokenSort' });
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
          >
            {enabledNetworks.length > 1
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
        useEvmSelectionLogic && !isEvmSelected
          ? () => null
          : handleFilterControls
      }
      endIconName={
        useEvmSelectionLogic && !isEvmSelected ? undefined : IconName.ArrowDown
      }
      style={isDisabled ? styles.controlButtonDisabled : styles.controlButton}
      disabled={isDisabled}
    />
  );

  const sortButton = (
    <ButtonIcon
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
