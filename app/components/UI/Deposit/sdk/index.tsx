import React, {
  ProviderProps,
  createContext,
  useContext,
  useMemo,
} from 'react';

export interface DepositSDK {
  // TODO: Add properties and methods to the DepositSDK interface
}

const DepositSDKContext = createContext<DepositSDK | undefined>(undefined);

export const DepositSDKProvider = ({
  value,
  ...props
}: ProviderProps<DepositSDK>) => {
  const contextValue = useMemo(
    (): DepositSDK => ({
      // TODO: Add properties and methods to the DepositSDK context value
    }),
    [],
  );

  return (
    <DepositSDKContext.Provider value={value || contextValue} {...props} />
  );
};

export const useDepositSDK = () => {
  const contextValue = useContext(DepositSDKContext);
  return contextValue as DepositSDK;
};
