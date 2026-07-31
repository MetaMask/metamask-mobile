import { useCallback, useState } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useDispatch, useSelector } from 'react-redux';
import { BatchSellMetricsLocation } from '@metamask/bridge-controller';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import { setSourceAmount } from '../../../../../core/redux/slices/bridge';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { selectBatchSellEnabled } from '../../../../../selectors/featureFlagController/batchSell';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { isHardwareAccount } from '../../../../../util/address';
import { TokenSelectorType } from '../../types';

const BATCH_SELL_ASSET_PICKER_BANNER_DISMISSED_KEY =
  'batch_sell_asset_picker_banner_dismissed';
export const BATCH_SELL_ASSET_PICKER_BANNER_LOCATION =
  'asset_picker_banner' as BatchSellMetricsLocation;

const getIsBatchSellAssetPickerBannerDismissed = () =>
  StorageWrapper.getItemSync(BATCH_SELL_ASSET_PICKER_BANNER_DISMISSED_KEY) ===
  'true';

interface UseBatchSellAssetPickerBannerParams {
  isSearchActive: boolean;
  pickerType?: TokenSelectorType;
}

export function useBatchSellAssetPickerBanner({
  isSearchActive,
  pickerType,
}: UseBatchSellAssetPickerBannerParams) {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const isBatchSellEnabled = useSelector(selectBatchSellEnabled);
  const selectedAddress = useSelector(selectSelectedInternalAccountAddress);
  const isHardwareWallet = selectedAddress
    ? Boolean(isHardwareAccount(selectedAddress))
    : false;
  const [isDismissed, setIsDismissed] = useState(
    getIsBatchSellAssetPickerBannerDismissed,
  );

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    StorageWrapper.setItem(
      BATCH_SELL_ASSET_PICKER_BANNER_DISMISSED_KEY,
      'true',
    ).catch(() => undefined);
  }, []);

  const handlePress = useCallback(() => {
    dismiss();
    dispatch(setSourceAmount(undefined));
    Engine.context.BridgeController.resetState();
    navigation.dispatch(
      StackActions.replace(Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT, {
        batchSellLocation: BATCH_SELL_ASSET_PICKER_BANNER_LOCATION,
        preserveBridgeState: true,
      }),
    );
  }, [dismiss, dispatch, navigation]);

  return {
    dismiss,
    handlePress,
    shouldShow:
      pickerType === TokenSelectorType.Source &&
      !isSearchActive &&
      !isDismissed &&
      isBatchSellEnabled &&
      !isHardwareWallet,
  };
}
