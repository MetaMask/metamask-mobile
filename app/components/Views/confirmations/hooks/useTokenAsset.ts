import { Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../locales/i18n';
import { selectAccountTokensAcrossChainsForAddress } from '../../../../selectors/multichain';
import { safeToChecksumAddress } from '../../../../util/address';
import { TokenI } from '../../../UI/Tokens/types';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { RootState } from '../../../../reducers';

const TypesForNativeToken = [
  TransactionType.simpleSend,
  TransactionType.stakingClaim,
  TransactionType.stakingDeposit,
  TransactionType.stakingUnstake,
];

export const useTokenAsset = () => {
  const {
    chainId,
    type: transactionType,
    txParams,
  } = useTransactionMetadataRequest() ?? {};

  const nativeTokenAddress = getNativeTokenAddress(chainId as Hex);

  // Use the transaction's from address to look up tokens
  // This ensures we get the correct tokens even when a non-EVM network is selected in the Network Manager
  const fromAddress = txParams?.from as string | undefined;
  const tokens = useSelector((state: RootState) =>
    selectAccountTokensAcrossChainsForAddress(state, fromAddress),
  );

  if (!chainId) {
    return { displayName: strings('token.unknown') };
  }

  const tokenAddress =
    transactionType && TypesForNativeToken.includes(transactionType)
      ? nativeTokenAddress
      : safeToChecksumAddress(txParams?.to)?.toLowerCase();

  const asset = tokens[chainId]?.find(
    ({ address }) => address.toLowerCase() === tokenAddress,
  ) as TokenI;

  if (!asset) {
    return { asset: {}, displayName: strings('token.unknown') };
  }

  const { name, symbol, ticker } = asset;
  const displayName = ticker ?? symbol ?? name ?? strings('token.unknown');

  return {
    asset,
    displayName,
  };
};
