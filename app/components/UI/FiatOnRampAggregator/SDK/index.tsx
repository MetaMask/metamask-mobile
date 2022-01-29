import React, { createContext, useContext, ProviderProps, useMemo } from 'react';
import { IOnRampSdk } from './IOnRampSdk';
import SDK from './MockedOnRampSdk';

const SDKContext = createContext<IOnRampSdk | undefined>(undefined);

export const FiatOnRampSDKProvider = ({ value, ...props }: ProviderProps<IOnRampSdk>) => {
	const sdk = useMemo(() => new SDK(), []);
	return <SDKContext.Provider value={value || sdk} {...props} />;
};

export const useFiatOnRampSDK = () => {
	const sdk = useContext(SDKContext);
	return sdk;
};

export default SDKContext;
