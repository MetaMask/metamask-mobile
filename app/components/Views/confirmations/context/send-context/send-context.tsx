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
