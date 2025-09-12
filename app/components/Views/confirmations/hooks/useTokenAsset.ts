import { Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../locales/i18n';
import { selectAccountTokensAcrossChains } from '../../../../selectors/multichain';
import { safeToChecksumAddress } from '../../../../util/address';
import { TokenI } from '../../../UI/Tokens/types';
import { getNativeTokenAddress } from '../utils/asset';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';

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
  const tokens = useSelector(selectAccountTokensAcrossChains);

  if (!chainId || !transactionType) {
    return { displayName: strings('token.unknown') };
  }

  const tokenAddress = TypesForNativeToken.includes(transactionType)
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
