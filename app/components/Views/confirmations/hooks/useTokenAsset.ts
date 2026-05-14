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

    if (isMusdClaim && !asset?.image) {
      // if the token is mUSD and has no image, return the mUSD constants
      return {
        asset: {
          symbol: MUSD_TOKEN.symbol,
          name: MUSD_TOKEN.name,
          decimals: MUSD_TOKEN.decimals,
          address: MUSD_TOKEN_ADDRESS,
          image: MUSD_TOKEN.image,
        } as Partial<TokenI>,
        displayName: MUSD_TOKEN.symbol,
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
