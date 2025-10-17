import React, {
  ReactElement,
  createContext,
  useContext,
  useState,
} from 'react';
import { isAddress as isEvmAddress } from 'ethers/lib/utils';

import { getAddressAccountType } from '../../../../../util/address';
import { useSendContext } from './send-context';

export const AssetFilterMethod = {
  None: 'none',
  Search: 'search',
};

export const AmountInputType = {
  Token: 'token',
  Fiat: 'fiat',
};

export const AmountInputMethod = {
  Manual: 'manual',
  PressedMax: 'pressed_max',
};

export const RecipientInputMethod = {
  Manual: 'manual',
  Pasted: 'pasted',
  SelectAccount: 'select_account',
  SelectContact: 'select_contact',
};

export interface SendMetricsContextType {
  accountType?: string;
  assetListSize: string;
  amountInputMethod: string;
  amountInputType: string;
  chainId?: string;
  chainIdCaip?: string;
  assetFilterMethod: string;
  setAmountInputMethod: (value: string) => void;
  setAmountInputType: (value: string) => void;
  setAssetFilterMethod: (value: string) => void;
  setAssetListSize: (value: string) => void;
}

export const SendMetricsContext = createContext<SendMetricsContextType>({
  accountType: undefined,
  assetListSize: '',
  amountInputMethod: AmountInputMethod.Manual,
  amountInputType: AmountInputType.Token,
  chainId: '',
  chainIdCaip: '',
  assetFilterMethod: AssetFilterMethod.None,
  setAmountInputMethod: () => undefined,
  setAmountInputType: () => undefined,
  setAssetFilterMethod: () => undefined,
  setAssetListSize: () => undefined,
});

// If app goes to idle state, `getAddressAccountType` throws an error because app is locked
// To prevent that, we catch the error and return undefined
const getAccountTypeSafely = (address: string): string | undefined => {
  try {
    return getAddressAccountType(address);
  } catch {
    return undefined;
  }
};

export const SendMetricsContextProvider: React.FC<{
  children: ReactElement[] | ReactElement;
}> = ({ children }) => {
  const [assetFilterMethod, setAssetFilterMethod] = useState(
    AssetFilterMethod.None,
  );
  const [assetListSize, setAssetListSize] = useState('');
  const [amountInputMethod, setAmountInputMethod] = useState(
    AmountInputMethod.Manual,
  );
  const [amountInputType, setAmountInputType] = useState(AmountInputType.Token);
  const { asset, from } = useSendContext();
  const chainId = asset?.chainId;
  const chainIdCaip = isEvmAddress(asset?.address || '')
    ? `eip155:${parseInt(asset?.chainId as string, 16)}`
    : asset?.chainId;

  return (
    <SendMetricsContext.Provider
      value={{
        accountType: isEvmAddress(from as string)
          ? getAccountTypeSafely(from as string)
          : undefined,
        assetListSize,
        amountInputMethod,
        amountInputType,
        assetFilterMethod,
        chainId,
        chainIdCaip,
        setAssetListSize,
        setAmountInputMethod,
        setAmountInputType,
        setAssetFilterMethod,
      }}
    >
      {children}
    </SendMetricsContext.Provider>
  );
};

export const useSendMetricsContext = () => {
  const context = useContext(SendMetricsContext);
  if (!context) {
    throw new Error(
      'useSendMetricsContext must be used within an SendMetricsContextProvider',
    );
  }
  return context;
};
