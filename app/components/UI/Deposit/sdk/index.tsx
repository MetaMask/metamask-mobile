import React, {
  ProviderProps,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import {
  selectDepositProviderFrontendAuth,
  selectDepositProviderApiKey,
} from '../../../../selectors/featureFlagController/deposit';
import { NativeRampsSdk } from '@consensys/native-ramps-sdk';

export interface DepositSDK {
  sdk?: NativeRampsSdk;
  sdkError?: Error;
  providerApiKey: string | null;
  providerFrontendAuth: string | null;
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
  const [sdkError, setSdkError] = useState<Error>();

  const contextValue = useMemo((): DepositSDK => {
    let sdk;

    try {
      if (!providerApiKey || !providerFrontendAuth) {
        throw new Error('Deposit SDK requires valid API key and frontend auth');
      }

      sdk = new NativeRampsSdk({
        partnerApiKey: providerApiKey,
        frontendAuth: providerFrontendAuth,
      });
    } catch (error) {
      setSdkError(error as Error);
    }

    return {
      sdk,
      providerApiKey,
      providerFrontendAuth,
    };
  }, [providerApiKey, providerFrontendAuth]);

  const finalContextValue = {
    ...contextValue,
    sdkError,
  };

  return (
    <DepositSDKContext.Provider value={value ?? finalContextValue} {...props} />
  );
};

export const useDepositSDK = () => {
  const contextValue = useContext(DepositSDKContext);
  if (!contextValue) {
    throw new Error('useDepositSDK must be used within a DepositSDKProvider');
  }
  return contextValue;
};
