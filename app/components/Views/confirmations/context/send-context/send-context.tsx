import React, {
  ReactElement,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import { TransactionParams } from '@metamask/transaction-controller';
import { toHex } from '@metamask/controller-utils';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { BNToHex, toTokenMinimalUnit, toWei } from '../../../../../util/number';
import { addTransaction } from '../../../../../util/transaction-controller';
import { generateTransferData } from '../../../../../util/transactions';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { AssetType } from '../../types/token';
import { MMM_ORIGIN } from '../../constants/confirmations';
import { isNativeToken } from '../../utils/generic';

export interface SendContextType {
  asset?: AssetType;
  cancelSend: () => void;
  submitSend: () => void;
  transactionParams?: TransactionParams;
  updateAsset: (asset: AssetType) => void;
  updateTransactionParams: (params: Partial<TransactionParams>) => void;
}

export const SendContext = createContext<SendContextType>({
  asset: undefined,
  cancelSend: () => undefined,
  submitSend: () => undefined,
  transactionParams: undefined,
  updateAsset: () => undefined,
  updateTransactionParams: () => undefined,
});

const prepareTransaction = (
  asset: AssetType,
  transactionParams: TransactionParams,
) => {
  const { from, to, value } = transactionParams;
  const trxnParams: TransactionParams = { from };
  if (isNativeToken(asset)) {
    trxnParams.data = '0x';
    trxnParams.to = to;
    trxnParams.value = BNToHex(toWei(value ?? '0'));
  } else if (asset.tokenId) {
    trxnParams.data = generateTransferData('transferFrom', {
      fromAddress: from,
      toAddress: to,
      tokenId: toHex(asset.tokenId),
    });
    trxnParams.to = asset.address;
    trxnParams.value = '0x0';
  } else {
    const tokenAmount = toTokenMinimalUnit(value ?? '0', asset.decimals);
    trxnParams.data = generateTransferData('transfer', {
      toAddress: to,
      amount: BNToHex(tokenAmount),
    });
    trxnParams.to = asset.address;
    trxnParams.value = '0x0';
  }
  return trxnParams;
};

export const SendContextProvider: React.FC<{
  children: ReactElement[] | ReactElement;
}> = ({ children }) => {
  const navigation = useNavigation();
  const [asset, updateAsset] = useState<AssetType>();
  const from = useSelector(selectSelectedInternalAccount);
  const [transactionParams, setTransactionParams] = useState<TransactionParams>(
    {
      from: from?.address as string,
      // to: '0x089595380921f555d52AB6f5a49defdAaB23B444',
    },
  );
  const { chainId } = asset ?? { chainId: undefined };
  const { NetworkController } = Engine.context;

  const updateTransactionParams = (params: Partial<TransactionParams>) => {
    setTransactionParams({ ...transactionParams, ...params });
  };

  const submitSend = useCallback(async () => {
    if (!chainId || !asset) {
      return;
    }
    // toHex is added here as sometime chainId in asset is not hexadecimal
    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      toHex(chainId),
    );
    const trxnParams = prepareTransaction(asset, transactionParams);
    await addTransaction(trxnParams, {
      origin: MMM_ORIGIN,
      networkClientId,
    });
    navigation.navigate(
      Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    );
  }, [asset, chainId, NetworkController, navigation, transactionParams]);

  const cancelSend = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SendContext.Provider
      value={{
        asset,
        cancelSend,
        submitSend,
        transactionParams,
        updateAsset,
        updateTransactionParams,
      }}
    >
      {children}
    </SendContext.Provider>
  );
};

export const useSendContext = () => {
  const context = useContext(SendContext);
  if (!context) {
    throw new Error(
      'useSendContext must be used within an SendContextProvider',
    );
  }
  return context;
};

const asset = {
  address: '0xB4feDc003053C22ac8b808Bb424f3e1787f30cF2',
  attributes: [],
  chainId: 1,
  collection: {
    contractDeployedAt: '2022-10-24T13:01:23.000Z',
    creator: '0x361bb0e9b8a6f875518aa9aebbe974b1f4230501',
    floorAsk: {
      id: '0x73e6306bed28ef4666564bfa8e5df443178cdb475bf8a1298b40d7f9932a7ff7',
      maker: '0x2e1c64af8f2637a9e60bbc8a8676862160e31554',
      price: [Object],
      source: [Object],
      validFrom: 1752715508,
      validUntil: 1757899508,
    },
    id: '0xb4fedc003053c22ac8b808bb424f3e1787f30cf2',
    imageUrl:
      'https://img.reservoir.tools/images/v2/mainnet/khnv7QtJSsXhx7z5lxeoZzdRhxUhp0LWnUSgD7%2FZMuWJsVNW07iFmpy8AiLxtq2rG4uZx8iTRGowEkKFgTDAuNU9C%2FqFZaZiyjADCX5OqfQLMxPeZkVQ1cJuuhBOesqpjL%2BOPFZ%2B8Z5farY9J9TEoq8B7loqQBrE27IsIO5XRg9FIgKL0qCFd1eCdZJMu8GeEQN2vFnIHgHpxQD6ftoVLIv9criMHjn2yfb0CdQYRTowAnIjR10q6Ni8xbHJiiltJsSLWOs1PlbKatDXjOQhIw%3D%3D?width=250',
    isNsfw: false,
    isSpam: false,
    metadataDisabled: false,
    name: 'Neymar Jr. - JungleVIBES',
    openseaVerificationStatus: 'approved',
    ownerCount: 37505,
    royalties: [[Object]],
    royaltiesBps: 500,
    slug: 'junglevibes-neymarjr',
    symbol: 'NRJJV',
    tokenCount: '70237',
    topBid: {
      id: '0xd383e3fc51c0fd08983243c1fd3a2a6c15d4efa84380db9b87187016513e6b3b',
      maker: '0xfebc9ba56cda711910ffd7017373ee4499c0fa9a',
      price: [Object],
      sourceDomain: 'magiceden.io',
      validFrom: 1752058699,
      validUntil: 1783595160,
    },
  },
  contractName: null,
  favorite: false,
  isCurrentlyOwned: true,
  logo: 'https://img.reservoir.tools/images/v2/mainnet/khnv7QtJSsXhx7z5lxeoZzdRhxUhp0LWnUSgD7%2FZMuWJsVNW07iFmpy8AiLxtq2rG4uZx8iTRGowEkKFgTDAuNU9C%2FqFZaZiyjADCX5OqfQLMxPeZkVQ1cJuuhBOesqpjL%2BOPFZ%2B8Z5farY9J9TEoq8B7loqQBrE27IsIO5XRg9FIgKL0qCFd1eCdZJMu8GeEQN2vFnIHgHpxQD6ftoVLIv9criMHjn2yfb0CdQYRTowAnIjR10q6Ni8xbHJiiltJsSLWOs1PlbKatDXjOQhIw%3D%3D?width=250',
  name: null,
  standard: 'ERC721',
  tokenId: '36506',
  topBid: {
    id: '0xd383e3fc51c0fd08983243c1fd3a2a6c15d4efa84380db9b87187016513e6b3b',
    price: { amount: [Object], currency: [Object], netAmount: [Object] },
    source: {
      domain: 'magiceden.io',
      icon: 'https://raw.githubusercontent.com/reservoirprotocol/assets/main/sources/magiceden-logo.svg',
      id: '0x8a75dd00f6766f27ac410e203c56b7693bf23c4d',
      name: 'Magic Eden',
      url: 'https://magiceden.io/item-details/ethereum/0xb4fedc003053c22ac8b808bb424f3e1787f30cf2/36506',
    },
  },
};
