import React, {
  ProviderProps,
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
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
  const [sdk, setSdk] = useState<NativeRampsSdk>();
  const [sdkError, setSdkError] = useState<Error>();

  useEffect(() => {
    try {
      if (!providerApiKey || !providerFrontendAuth) {
        throw new Error('Deposit SDK requires valid API key and frontend auth');
      }

      const sdkInstance = new NativeRampsSdk({
        partnerApiKey: providerApiKey,
        frontendAuth: providerFrontendAuth,
      });

      setSdk(sdkInstance);
    } catch (error) {
      setSdkError(error as Error);
    }
  }, [providerApiKey, providerFrontendAuth]);

  const contextValue = useMemo(
    (): DepositSDK => ({
      sdk,
      sdkError,
      providerApiKey,
      providerFrontendAuth,
    }),
    [sdk, sdkError, providerApiKey, providerFrontendAuth],
  );

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
