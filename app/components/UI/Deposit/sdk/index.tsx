import React, {
  ProviderProps,
  createContext,
  useContext,
  useMemo,
  useEffect,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';

export interface DepositSDK {
  // TODO: Add properties and methods to the DepositSDK interface
  depositsProviderApiKey: string | null;
  depositsFrontendAuth: string | null;
}

const DepositSDKContext = createContext<DepositSDK | undefined>(undefined);

export const DepositSDKProvider = ({
  value,
  ...props
}: ProviderProps<DepositSDK>) => {
  const remoteFeatureFlags = useSelector(selectRemoteFeatureFlags);
  const [depositsProviderApiKey, setDepositsProviderApiKey] = useState<
    string | null
  >(null);
  const [depositsFrontendAuth, setDepositsFrontendAuth] = useState<
    string | null
  >(null);

  useEffect(() => {
    const apiKey =
      (remoteFeatureFlags['deposits-provider-api-key'] as string) || null;
    const frontendAuth =
      (remoteFeatureFlags['deposits-frontend-auth'] as string) || null;

    setDepositsProviderApiKey(apiKey);
    setDepositsFrontendAuth(frontendAuth);
  }, [remoteFeatureFlags]);

  const contextValue = useMemo(
    (): DepositSDK => ({
      // TODO: Add properties and methods to the DepositSDK context value
      depositsProviderApiKey,
      depositsFrontendAuth,
    }),
    [depositsProviderApiKey, depositsFrontendAuth],
  );

  return (
    <DepositSDKContext.Provider value={value || contextValue} {...props} />
  );
};

export const useDepositSDK = () => {
  const contextValue = useContext(DepositSDKContext);
  return contextValue as DepositSDK;
};
