import React, {
  ReactElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Hex } from '@metamask/utils';
import { TransactionParams } from '@metamask/transaction-controller';
import { toHex } from '@metamask/controller-utils';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { addTransaction } from '../../../../../util/transaction-controller';
import { selectAccounts } from '../../../../../selectors/accountTrackerController.ts';
import { selectContractBalances } from '../../../../../selectors/tokenBalancesController.ts';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { AssetType } from '../../types/token';
import { MMM_ORIGIN } from '../../constants/confirmations';
import { prepareEVMTransaction, validateAmount } from './utils.ts';

export interface SendContextType {
  amountError?: string;
  asset?: AssetType;
  cancelSend: () => void;
  sendDisabled: boolean;
  submitSend: () => void;
  transactionParams?: TransactionParams;
  updateAsset: (asset: AssetType) => void;
  updateTransactionParams: (params: Partial<TransactionParams>) => void;
}

export const SendContext = createContext<SendContextType>({
  amountError: undefined,
  asset: undefined,
  cancelSend: () => undefined,
  sendDisabled: false,
  submitSend: () => undefined,
  transactionParams: undefined,
  updateAsset: () => undefined,
  updateTransactionParams: () => undefined,
});

export const SendContextProvider: React.FC<{
  children: ReactElement[] | ReactElement;
}> = ({ children }) => {
  const navigation = useNavigation();
  const accounts = useSelector(selectAccounts);
  const contractBalances = useSelector(selectContractBalances);
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

  const amountError = useMemo(
    () =>
      validateAmount({
        accounts,
        amount: transactionParams.value,
        asset,
        contractBalances,
        from: from?.address as Hex,
      }),
    [accounts, asset, from?.address, transactionParams],
  );

  const sendDisabled = useMemo(() => {
    const { value, to } = transactionParams;
    return (
      Boolean(amountError) ||
      value === undefined ||
      value === null ||
      value === '' ||
      !to
    );
  }, [amountError]);

  const submitSend = useCallback(async () => {
    if (!chainId || !asset) {
      return;
    }
    // toHex is added here as sometime chainId in asset is not hexadecimal
    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      toHex(chainId),
    );
    const trxnParams = prepareEVMTransaction(asset, transactionParams);
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

  const updateTransactionParams = (params: Partial<TransactionParams>) => {
    setTransactionParams({ ...transactionParams, ...params });
  };

  return (
    <SendContext.Provider
      value={{
        amountError,
        asset,
        cancelSend,
        sendDisabled,
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

const from = {
  address: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
  id: '10b8c7f2-bbf5-4cbd-a698-8926cbcc6a22',
  metadata: {
    importTime: 1753184781336,
    keyring: { type: 'Simple Key Pair' },
    lastSelected: 1753184787301,
    name: 'Account 9',
  },
  methods: [
    'personal_sign',
    'eth_sign',
    'eth_signTransaction',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
  ],
  options: {},
  scopes: ['eip155:0'],
  type: 'eip155:eoa',
};
const accounts = {
  '0x089595380921f555d52AB6f5a49defdAaB23B444': {
    balance: '0x1fcdbab3ac70',
    stakedBalance: '0x00',
  },
  '0x5C537a8Fe86261998a96F65e5325cA87cfCade17': {
    balance: '0x2742f73c1250',
    stakedBalance: '0x00',
  },
  '0x8aDbe3f9c084eafE03b7a229c9926E81F2f44537': {
    balance: '0x0',
    stakedBalance: '0x00',
  },
  '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477': {
    balance: '0x1e0fec93dcc0',
    stakedBalance: '0x00',
  },
  '0xDc47789de4ceFF0e8Fe9D15D728Af7F17550c164': {
    balance: '0x62bf374bf3e1',
    stakedBalance: '0x00',
  },
  '0xE786Abcd8E87067465aDd0007BAa00bED2282A7F': {
    balance: '0x2448431bab20',
    stakedBalance: '0x00',
  },
  '0xa4A80ce0AFDfb8E6bd1221D3b18a1653EEE6d19d': {
    balance: '0x2436579ecd78',
    stakedBalance: '0x00',
  },
  '0xc982D4b080bB5BC1B39d7675603Da5Ea3705A78B': {
    balance: '0x27196d148900',
    stakedBalance: '0x00',
  },
  '0xf0F0843102E18bC584851dD90FA310F6a1576cc1': {
    balance: '0x1d3ddd2067b8',
    stakedBalance: '0x00',
  },
};
