import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Collection } from '@metamask/assets-controllers';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import { TokenI } from '../../../UI/Tokens/types';
import { useAsyncResult } from '../../../hooks/useAsyncResult';
import Engine from '../../../../core/Engine';
import { RootState } from '../../../../reducers';
import { makeSelectAssetByAddressAndChainId } from '../../../../selectors/multichain';
import { safeToChecksumAddress } from '../../../../util/address';
import { NATIVE_TOKEN_ADDRESS } from '../constants/tokens';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { parseStandardTokenTransactionData } from '../utils/transaction';

const useCollectionsMetadata = (tokenAddress: string, chainId: Hex) => {
  const { NftController } = Engine.context;

  const { value: collectionsMetadata } = useAsyncResult(async () => {
    const collectionsResult = await NftController.getNFTContractInfo(
      [tokenAddress],
      chainId,
    );

    const collectionsData = collectionsResult.collections.reduce<
      Record<string, Collection>
    >((acc, collection) => {
      acc[tokenAddress] = {
        name: collection?.name,
        image: collection?.image,
        isSpam: collection?.isSpam,
      };
      return acc;
    }, {});

    return collectionsData;
  }, []);

  return collectionsMetadata;
};

export const useTokenAssetByType = () => {
  const { chainId, type: transactionType, txParams } = useTransactionMetadataRequest() ?? {};

  const transferData = parseStandardTokenTransactionData(txParams?.data);
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

  const collectionsMetadata = useCollectionsMetadata(tokenAddress, chainId as Hex);

  let asset = {} as TokenI;
  let tokenName, tokenId, tokenImage, tokenSymbol;

  switch (transactionType) {
    case TransactionType.contractInteraction:
    case TransactionType.stakingClaim:
    case TransactionType.stakingDeposit:
    case TransactionType.stakingUnstake:
    case TransactionType.simpleSend: {
      // Native
      asset = nativeEvmAsset ?? {} as TokenI;
      tokenName = asset?.name;
      tokenImage = asset?.image || asset?.logo;
      tokenSymbol = asset?.ticker;
      break;
    }
    case TransactionType.tokenMethodTransferFrom: {
      // ERC721 - ERC1155
      tokenId = transferData?.args[transferData?.args.length - 1].toString();
      tokenImage = collectionsMetadata?.[tokenAddress]?.image;
      tokenName = collectionsMetadata?.[tokenAddress]?.name;
      break;
    }
    default: {
      // ERC20
      asset = evmAsset ?? {} as TokenI;
      break;
    }
  }

  return {
    asset,
    tokenName,
    tokenId,
    tokenImage,
    tokenSymbol,
  };
};
