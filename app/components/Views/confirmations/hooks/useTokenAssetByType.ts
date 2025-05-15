import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import { strings } from '../../../../../locales/i18n';
import { TokenI } from '../../../UI/Tokens/types';
import { RootState } from '../../../../reducers';
import { makeSelectAssetByAddressAndChainId } from '../../../../selectors/multichain';
import { safeToChecksumAddress } from '../../../../util/address';
import { NATIVE_TOKEN_ADDRESS } from '../constants/tokens';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';

export const useTokenAssetByType = () => {
  const { chainId, type: transactionType, txParams } = useTransactionMetadataRequest() ?? {};

  const tokenAddress = safeToChecksumAddress(txParams?.to)?.toLowerCase() || NATIVE_TOKEN_ADDRESS;

  const selectEvmAsset = useMemo(makeSelectAssetByAddressAndChainId, []);
  const evmAsset = useSelector((state: RootState) =>
    selectEvmAsset(state, {
      address: tokenAddress,
      chainId: chainId as Hex,
      isStaked: false,
    }),
  );
  const nativeEvmAsset = useSelector((state: RootState) =>
    selectEvmAsset(state, {
      address: NATIVE_TOKEN_ADDRESS,
      chainId: chainId as Hex,
      isStaked: false,
    }),
  );

  let asset = {} as TokenI;

  switch (transactionType) {
    case TransactionType.contractInteraction:
    case TransactionType.stakingClaim:
    case TransactionType.stakingDeposit:
    case TransactionType.stakingUnstake:
    case TransactionType.simpleSend: {
      // Native
      asset = nativeEvmAsset ?? {} as TokenI;
      break;
    }
    default: {
      // ERC20
      asset = evmAsset ?? {} as TokenI;
      break;
    }
  }

  if (!asset.ticker) {
    asset.name = strings('token.unknown');
    asset.ticker = strings('token.unknown');
  }

  return {
    asset,
  };
};
