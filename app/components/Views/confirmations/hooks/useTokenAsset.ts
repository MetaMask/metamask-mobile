import { Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../locales/i18n';
import { selectAccountTokensAcrossChains } from '../../../../selectors/multichain';
import { safeToChecksumAddress } from '../../../../util/address';
import { TokenI } from '../../../UI/Tokens/types';
import { getNativeTokenAddress } from '../utils/asset';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { useGetTokenStandardAndDetails } from './useGetTokenStandardAndDetails';
import Engine from '../../../../core/Engine';

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

  // If asset is not in state, try to fetch token details on-demand
  const networkClientId =
    Engine.context.NetworkController.findNetworkClientIdByChainId(
      chainId as Hex,
    );

  const { details: tokenDetails } = useGetTokenStandardAndDetails(
    !asset && tokenAddress ? (tokenAddress as Hex) : undefined,
    networkClientId,
  );

  // If token is not in state but we have fetched details, use those
  if (!asset && tokenDetails?.symbol) {
    const displayName =
      tokenDetails.symbol ?? tokenDetails.name ?? strings('token.unknown');

    return {
      asset: {
        symbol: tokenDetails.symbol,
        name: tokenDetails.name,
        address: tokenAddress,
      } as Partial<TokenI>,
      displayName,
    };
  }

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
