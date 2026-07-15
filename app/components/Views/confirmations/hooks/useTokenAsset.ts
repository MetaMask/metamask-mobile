import { Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { strings } from '../../../../../locales/i18n';
import { selectAccountTokensAcrossChainsForAddress } from '../../../../selectors/multichain';
import { safeToChecksumAddress } from '../../../../util/address';
import { TokenI } from '../../../UI/Tokens/types';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { RootState } from '../../../../reducers';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
} from '../../../UI/Earn/constants/musd';

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
  const fromAddress = txParams?.from;
  const tokens = useSelector((state: RootState) =>
    selectAccountTokensAcrossChainsForAddress(state, fromAddress),
  );

  const result = useMemo(() => {
    if (!chainId) {
      return { displayName: strings('token.unknown') };
    }

    const isMusdClaim = transactionType === TransactionType.musdClaim;

    // For musdClaim, txParams.to is the Merkl distributor contract, not the mUSD token
    const tokenAddress = isMusdClaim
      ? MUSD_TOKEN_ADDRESS.toLowerCase()
      : transactionType && TypesForNativeToken.includes(transactionType)
        ? nativeTokenAddress
        : safeToChecksumAddress(txParams?.to)?.toLowerCase();

    const asset = tokens[chainId]?.find(
      ({ address }) => address.toLowerCase() === tokenAddress,
    ) as TokenI;

    if (isMusdClaim) {
      // Handle both "not in wallet" and "in wallet without logo" in one place.
      // mUSD can be added to the wallet before the token list service hydrates its
      // image URL, so we always fall back to the known logo for this tx type.
      return {
        asset: {
          ...asset,
          symbol: asset?.symbol ?? MUSD_TOKEN.symbol,
          name: asset?.name ?? MUSD_TOKEN.name,
          decimals: asset?.decimals ?? MUSD_TOKEN.decimals,
          address: MUSD_TOKEN_ADDRESS,
          image: asset?.image ?? MUSD_TOKEN.image,
        } as Partial<TokenI>,
        displayName: asset?.ticker ?? asset?.symbol ?? MUSD_TOKEN.symbol,
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
  }, [chainId, transactionType, nativeTokenAddress, txParams?.to, tokens]);

  return result;
};
