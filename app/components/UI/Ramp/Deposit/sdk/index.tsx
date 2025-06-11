import React, {
  ProviderProps,
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectDepositProviderFrontendAuth,
  selectDepositProviderApiKey,
} from '../../../../../selectors/featureFlagController/deposit';
import {
  NativeRampsSdk,
  NativeTransakAccessToken,
  TransakEnvironment,
} from '@consensys/native-ramps-sdk';
import {
  getProviderToken,
  resetProviderToken,
  storeProviderToken,
} from '../utils/ProviderTokenVault';
import {
  fiatOrdersGetStartedDeposit,
  setFiatOrdersGetStartedDeposit,
} from '../../../../../reducers/fiatOrders';

export interface DepositSDK {
  sdk?: NativeRampsSdk;
  sdkError?: Error;
  providerApiKey: string | null;
  providerFrontendAuth: string | null;
  isAuthenticated: boolean;
  authToken?: NativeTransakAccessToken;
  setAuthToken: (token: NativeTransakAccessToken) => Promise<boolean>;
  clearAuthToken: () => Promise<void>;
  checkExistingToken: () => Promise<boolean>;
  getStarted: boolean;
  setGetStarted: (seen: boolean) => void;
}

const isDevelopment =
  process.env.NODE_ENV !== 'production' ||
  process.env.RAMP_DEV_BUILD === 'true';
const isInternalBuild = process.env.RAMP_INTERNAL_BUILD === 'true';
const isDevelopmentOrInternalBuild = isDevelopment || isInternalBuild;

let environment = TransakEnvironment.Production;
if (isDevelopmentOrInternalBuild) {
  environment = TransakEnvironment.Staging;
}

export const DepositSDKContext = createContext<DepositSDK | undefined>(
  undefined,
);

export const DepositSDKProvider = ({
  value,
  ...props
}: Partial<ProviderProps<DepositSDK>>) => {
  const dispatch = useDispatch();
  const providerApiKey = useSelector(selectDepositProviderApiKey);
  const providerFrontendAuth = useSelector(selectDepositProviderFrontendAuth);
  const [sdk, setSdk] = useState<NativeRampsSdk>();
  const [sdkError, setSdkError] = useState<Error>();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<NativeTransakAccessToken>();

  const INITIAL_GET_STARTED = useSelector(fiatOrdersGetStartedDeposit);
  const [getStarted, setGetStarted] = useState<boolean>(INITIAL_GET_STARTED);

  const setGetStartedCallback = useCallback(
    (getStartedFlag: boolean) => {
      setGetStarted(getStartedFlag);
      dispatch(setFiatOrdersGetStartedDeposit(getStartedFlag));
    },
    [dispatch],
  );

  useEffect(() => {
    try {
      if (!providerApiKey || !providerFrontendAuth) {
        throw new Error('Deposit SDK requires valid API key and frontend auth');
      }

      const sdkInstance = new NativeRampsSdk(
        {
          partnerApiKey: providerApiKey,
          frontendAuth: providerFrontendAuth,
        },
        environment,
      );

      setSdk(sdkInstance);
    } catch (error) {
      setSdkError(error as Error);
    }
  }, [providerApiKey, providerFrontendAuth]);

  useEffect(() => {
    if (sdk && authToken) {
      sdk.setAccessToken(authToken);
      setIsAuthenticated(true);
    }
  }, [sdk, authToken]);

  const checkExistingToken = useCallback(async () => {
    try {
      const tokenResponse = await getProviderToken();
      if (tokenResponse.success && tokenResponse.token) {
        setAuthToken(tokenResponse.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking existing token:', error);
      return false;
    }
  }, []);

  const setAuthTokenCallback = useCallback(
    async (token: NativeTransakAccessToken): Promise<boolean> => {
      try {
        const storeResult = await storeProviderToken(token);
        if (storeResult.success) {
          setAuthToken(token);
          setIsAuthenticated(true);
          if (sdk) {
            sdk.setAccessToken(token);
          }
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error setting auth token:', error);
        return false;
      }
    },
    [sdk],
  );

  const clearAuthToken = useCallback(async () => {
    await resetProviderToken();
    setAuthToken(undefined);
    setIsAuthenticated(false);
    if (sdk) {
      sdk.clearAccessToken();
    }
  }, [sdk]);

  const contextValue = useMemo(
    (): DepositSDK => ({
      sdk,
      sdkError,
      providerApiKey,
      providerFrontendAuth,
      isAuthenticated,
      authToken,
      setAuthToken: setAuthTokenCallback,
      clearAuthToken,
      checkExistingToken,
      getStarted,
      setGetStarted: setGetStartedCallback,
    }),
    [
      sdk,
      sdkError,
      providerApiKey,
      providerFrontendAuth,
      isAuthenticated,
      authToken,
      setAuthTokenCallback,
      clearAuthToken,
      checkExistingToken,
      getStarted,
      setGetStartedCallback,
    ],
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

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withDepositSDK = (Component: React.FC) => (props: any) =>
  (
    <DepositSDKProvider>
      <Component {...props} />
    </DepositSDKProvider>
  );
