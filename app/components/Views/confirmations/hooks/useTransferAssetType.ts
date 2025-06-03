import { useEffect, useState } from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { useAsyncResult } from '../../../hooks/useAsyncResult';
import { memoizedGetTokenStandardAndDetails } from '../utils/token';

const METRICS_ASSET_TYPES = {
  native: 'native',
  erc20: 'erc20',
  erc721: 'erc721',
  erc1155: 'erc1155',
  unknown: 'unknown',
};

export const useTransferAssetType = () => {
  const transactionMetadata = useTransactionMetadataRequest();
  const { value: details } = useAsyncResult(
    async () =>
      await memoizedGetTokenStandardAndDetails({
        tokenAddress: transactionMetadata?.txParams?.to,
        networkClientId: transactionMetadata?.networkClientId,
      }),
    [transactionMetadata?.txParams?.to, transactionMetadata?.networkClientId],
  );

  const [assetType, setAssetType] = useState(METRICS_ASSET_TYPES.unknown);

  useEffect(() => {
    switch (transactionMetadata?.type) {
      case TransactionType.simpleSend: {
        setAssetType(METRICS_ASSET_TYPES.native);
        break;
      }
      case TransactionType.contractInteraction:
      case TransactionType.tokenMethodTransfer: {
        setAssetType(METRICS_ASSET_TYPES.erc20);
        break;
      }
      case TransactionType.tokenMethodTransferFrom:
      case TransactionType.tokenMethodSafeTransferFrom: {
        const standardLower = details?.standard?.toLowerCase();
        const validAssetType =
          standardLower && standardLower in METRICS_ASSET_TYPES
            ? (standardLower as keyof typeof METRICS_ASSET_TYPES)
            : METRICS_ASSET_TYPES.unknown;
        setAssetType(validAssetType);
        break;
      }
      default: {
        setAssetType(METRICS_ASSET_TYPES.unknown);
        break;
      }
    }
  }, [details, transactionMetadata?.type]);

  return {
    assetType,
  };
};
