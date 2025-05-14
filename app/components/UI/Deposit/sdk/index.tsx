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

export interface DepositSDK {
  // TODO: Add properties and methods to the DepositSDK interface
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

  const contextValue = useMemo(
    (): DepositSDK => ({
      // TODO: Add properties and methods to the DepositSDK context value
      providerApiKey,
      providerFrontendAuth,
    }),
    [providerApiKey, providerFrontendAuth],
  );

  return (
    <DepositSDKContext.Provider value={value ?? contextValue} {...props} />
  );
};

export const useDepositSDK = () => {
  const contextValue = useContext(DepositSDKContext);
  return contextValue as DepositSDK;
};
