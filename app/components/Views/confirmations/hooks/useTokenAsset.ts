import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { getNativeAssetForChainId } from '@metamask/bridge-controller';

import { strings } from '../../../../../locales/i18n';
import { TokenI } from '../../../UI/Tokens/types';
import { RootState } from '../../../../reducers';
import { makeSelectAssetByAddressAndChainId } from '../../../../selectors/multichain';
import { safeToChecksumAddress } from '../../../../util/address';
import { getNativeTokenAddress } from '../utils/asset';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';

const selectEvmAsset = makeSelectAssetByAddressAndChainId();

export const useTokenAsset = () => {
  const {
    chainId,
    type: transactionType,
    txParams,
  } = useTransactionMetadataRequest() ?? {};

  const nativeTokenAddress = getNativeTokenAddress(chainId as Hex);
  const tokenAddress =
    safeToChecksumAddress(txParams?.to)?.toLowerCase() || nativeTokenAddress;

  const evmAsset = useSelector((state: RootState) =>
    selectEvmAsset(state, {
      address: tokenAddress,
      chainId: chainId as Hex,
    }),
  );

  let nativeEvmAsset = useSelector((state: RootState) =>
    selectEvmAsset(state, {
      address: nativeTokenAddress,
      chainId: chainId as Hex,
    }),
  );
  if (transactionType === 'simpleSend' && !nativeEvmAsset && chainId) {
    nativeEvmAsset = getNativeAssetForChainId(chainId) as unknown as TokenI;
  }

  let asset = {} as TokenI;

  switch (transactionType) {
    case TransactionType.simpleSend:
    case TransactionType.stakingClaim:
    case TransactionType.stakingDeposit:
    case TransactionType.stakingUnstake: {
      // Native
      asset = nativeEvmAsset ?? ({} as TokenI);
      break;
    }
    case TransactionType.contractInteraction:
    case TransactionType.tokenMethodTransfer:
    default: {
      // ERC20
      asset = evmAsset ?? ({} as TokenI);
      break;
    }
  }

  const { name, symbol, ticker } = asset;
  const displayName = ticker ?? symbol ?? name ?? strings('token.unknown');

  return {
    asset,
    displayName,
  };
};
