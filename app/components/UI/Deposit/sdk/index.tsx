import React, {
  ProviderProps,
  createContext,
  useContext,
  useMemo,
} from 'react';
import { useSelector } from 'react-redux';
import {
  selectDepositProviderFrontendAuth,
  selectDepositProviderApiKey,
} from '../../../../selectors/featureFlagController/deposit';
import { NativeRampsSdk } from '@consensys/native-ramps-sdk';

export interface DepositSDK {
  sdk: NativeRampsSdk;
  providerApiKey: string;
  providerFrontendAuth: string;
}

export const DepositSDKContext = createContext<DepositSDK | undefined>(
  undefined,
);

export const DepositSDKProvider = ({
  value,
  ...props
}: Partial<ProviderProps<DepositSDK>>) => {
  const providerApiKey = useSelector(selectDepositProviderApiKey);
  const providerFrontendAuth = useSelector(selectDepositProviderFrontendAuth);

  const contextValue = useMemo((): DepositSDK => {
    if (!providerApiKey || !providerFrontendAuth) {
      throw new Error('Deposit SDK requires valid API key and frontend auth');
    }

    const sdk = new NativeRampsSdk({
      partnerApiKey: providerApiKey,
      frontendAuth: providerFrontendAuth,
    });

    return {
      sdk,
      providerApiKey,
      providerFrontendAuth,
    };
  }, [providerApiKey, providerFrontendAuth]);

  return (
    <DepositSDKContext.Provider value={value ?? contextValue} {...props} />
  );
};

export const useDepositSDK = () => {
  const contextValue = useContext(DepositSDKContext);
  if (!contextValue) {
    throw new Error('useDepositSDK must be used within a DepositSDKProvider');
  }
  return contextValue;
};
