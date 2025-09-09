import { isAddress as isEvmAddress } from 'ethers/lib/utils';
import { useCallback } from 'react';

import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import {
  AssetFilterMethod,
  useSendMetricsContext,
} from '../../../context/send-context/send-metrics-context';
import { AssetType, Nft } from '../../../types/token';

const ASSET_TYPE = {
  NFT: 'nft',
  NATIVE: 'native',
  TOKEN: 'token',
};

export const useAssetSelectionMetrics = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const {
    accountType,
    assetFilterMethod,
    assetListSize,
    setAssetFilterMethod,
    setAssetListSize,
  } = useSendMetricsContext();

  const setSearchAssetFilterMethod = useCallback(() => {
    setAssetFilterMethod(AssetFilterMethod.Search);
  }, [setAssetFilterMethod]);

  const setNoneAssetFilterMethod = useCallback(() => {
    setAssetFilterMethod(AssetFilterMethod.None);
  }, [setAssetFilterMethod]);

  const captureAssetSelected = useCallback(
    (sendAsset: AssetType | Nft, position: string) => {
      let assetType = ASSET_TYPE.TOKEN;
      if (sendAsset?.tokenId) {
        assetType = ASSET_TYPE.NFT;
      } else if ('isNative' in sendAsset && sendAsset?.isNative) {
        assetType = ASSET_TYPE.NATIVE;
      }
      const isEvmSendType = isEvmAddress(sendAsset.address);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SEND_ASSET_SELECTED)
          .addProperties({
            account_type: accountType,
            asset_type: assetType,
            asset_list_position: position,
            asset_list_size: assetListSize,
            chain_id: isEvmSendType ? sendAsset?.chainId : undefined,
            chain_id_caip: isEvmSendType ? undefined : sendAsset?.chainId,
            filter_method: assetFilterMethod,
          })
          .build(),
      );
    },
    [
      accountType,
      assetFilterMethod,
      assetListSize,
      createEventBuilder,
      trackEvent,
    ],
  );

  return {
    captureAssetSelected,
    setAssetListSize,
    setNoneAssetFilterMethod,
    setSearchAssetFilterMethod,
  };
};
