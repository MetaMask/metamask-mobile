import React, {
  ProviderProps,
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { selectDepositProviderApiKey } from '../../../../../selectors/featureFlagController/deposit';
import {
  NativeRampsSdk,
  NativeTransakAccessToken,
  NativeTransakUserDetails,
  Context,
  DepositPaymentMethod,
  DepositRegion,
  DepositCryptoCurrency,
} from '@consensys/native-ramps-sdk';
import {
  getProviderToken,
  resetProviderToken,
  storeProviderToken,
} from '../utils/ProviderTokenVault';
import { getSdkEnvironment } from './getSdkEnvironment';
import {
  fiatOrdersGetStartedDeposit,
  setFiatOrdersGetStartedDeposit,
  fiatOrdersRegionSelectorDeposit,
  setFiatOrdersRegionDeposit,
  fiatOrdersCryptoCurrencySelectorDeposit,
  setFiatOrdersCryptoCurrencyDeposit,
  fiatOrdersPaymentMethodSelectorDeposit,
  setFiatOrdersPaymentMethodDeposit,
} from '../../../../../reducers/fiatOrders';
import Logger from '../../../../../util/Logger';
import { strings } from '../../../../../../locales/i18n';
import useRampAccountAddress from '../../hooks/useRampAccountAddress';
import useAnalytics from '../../hooks/useAnalytics';
import { AxiosError } from 'axios';

export interface FetchUserDetailsParams {
  screenLocation?: string;
  shouldTrackFetch?: boolean;
}

export interface DepositSDK {
  sdk?: NativeRampsSdk;
  sdkError?: Error;
  providerApiKey: string | null;
  isAuthenticated: boolean;
  authToken?: NativeTransakAccessToken;
  setAuthToken: (token: NativeTransakAccessToken) => Promise<boolean>;
  logoutFromProvider: (requireServerInvalidation?: boolean) => Promise<void>;
  checkExistingToken: () => Promise<boolean>;
  getStarted: boolean;
  setGetStarted: (seen: boolean) => void;
  selectedWalletAddress: string | null;
  selectedRegion: DepositRegion | null;
  setSelectedRegion: (region: DepositRegion | null) => void;
  selectedPaymentMethod: DepositPaymentMethod | null;
  setSelectedPaymentMethod: (paymentMethod: DepositPaymentMethod) => void;
  selectedCryptoCurrency: DepositCryptoCurrency | null;
  setSelectedCryptoCurrency: (cryptoCurrency: DepositCryptoCurrency) => void;
  userDetails: NativeTransakUserDetails | null;
  userDetailsError: string | null;
  isFetchingUserDetails: boolean;
  fetchUserDetails: (
    params: FetchUserDetailsParams,
  ) => Promise<NativeTransakUserDetails | undefined>;
}

const environment = getSdkEnvironment();

const context =
  Platform.OS === 'ios' ? Context.MobileIOS : Context.MobileAndroid;
export const DEPOSIT_ENVIRONMENT = environment;
export const DepositSDKNoAuth = new NativeRampsSdk(
  {
    context,
  },
  environment,
);

export const DepositSDKContext = createContext<DepositSDK | undefined>(
  undefined,
);

export const DepositSDKProvider = ({
  value,
  ...props
}: Partial<ProviderProps<DepositSDK>>) => {
  const dispatch = useDispatch();
  const providerApiKey = useSelector(selectDepositProviderApiKey);
  const trackEventCallback = useAnalytics();

  const [sdk, setSdk] = useState<NativeRampsSdk>();
  const [sdkError, setSdkError] = useState<Error>();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<NativeTransakAccessToken>();
  const [userDetails, setUserDetails] =
    useState<NativeTransakUserDetails | null>(null);
  const [userDetailsError, setUserDetailsError] = useState<string | null>(null);
  const [isFetchingUserDetails, setIsFetchingUserDetails] =
    useState<boolean>(false);

  const INITIAL_GET_STARTED = useSelector(fiatOrdersGetStartedDeposit);
  const INITIAL_SELECTED_REGION: DepositRegion | null = useSelector(
    fiatOrdersRegionSelectorDeposit,
  );
  const INITIAL_SELECTED_CRYPTO_CURRENCY: DepositCryptoCurrency | null =
    useSelector(fiatOrdersCryptoCurrencySelectorDeposit);
  const INITIAL_SELECTED_PAYMENT_METHOD: DepositPaymentMethod | null =
    useSelector(fiatOrdersPaymentMethodSelectorDeposit);
  const [getStarted, setGetStarted] = useState<boolean>(INITIAL_GET_STARTED);

  const [selectedRegion, setSelectedRegion] = useState<DepositRegion | null>(
    INITIAL_SELECTED_REGION,
  );

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<DepositPaymentMethod | null>(INITIAL_SELECTED_PAYMENT_METHOD);
  const [selectedCryptoCurrency, setSelectedCryptoCurrency] =
    useState<DepositCryptoCurrency | null>(INITIAL_SELECTED_CRYPTO_CURRENCY);

  const selectedWalletAddress = useRampAccountAddress(
    selectedCryptoCurrency?.chainId,
  );

  const setGetStartedCallback = useCallback(
    (getStartedFlag: boolean) => {
      setGetStarted(getStartedFlag);
      dispatch(setFiatOrdersGetStartedDeposit(getStartedFlag));
    },
    [dispatch],
  );

  const setSelectedRegionCallback = useCallback(
    (region: DepositRegion | null) => {
      setSelectedRegion(region);
      dispatch(setFiatOrdersRegionDeposit(region));
    },
    [dispatch],
  );

  const setSelectedCryptoCurrencyCallback = useCallback(
    (cryptoCurrency: DepositCryptoCurrency | null) => {
      setSelectedCryptoCurrency(cryptoCurrency);
      dispatch(setFiatOrdersCryptoCurrencyDeposit(cryptoCurrency));
    },
    [dispatch],
  );

  const setSelectedPaymentMethodCallback = useCallback(
    (paymentMethod: DepositPaymentMethod | null) => {
      setSelectedPaymentMethod(paymentMethod);
      dispatch(setFiatOrdersPaymentMethodDeposit(paymentMethod));
    },
    [dispatch],
  );

  useEffect(() => {
    try {
      if (!providerApiKey) {
        throw new Error('Deposit SDK requires valid API key');
      }

      const sdkInstance = new NativeRampsSdk(
        {
          apiKey: providerApiKey,
          context,
        },
        environment,
      );

      setSdk(sdkInstance);
    } catch (error) {
      setSdkError(error as Error);
    }
  }, [providerApiKey]);

  useEffect(() => {
    if (sdk && authToken) {
      sdk.setAccessToken(authToken);
      setIsAuthenticated(true);
    }
  }, [sdk, authToken]);

  const checkExistingToken = useCallback(async () => {
    try {
      const tokenResponse = await getProviderToken();

      if (tokenResponse.success && tokenResponse.token?.accessToken) {
        setAuthToken(tokenResponse.token);
        return true;
      }
      return false;
    } catch (error) {
      Logger.error(error as Error, 'Error checking existing token:');
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
        Logger.error(error as Error, 'Error setting auth token:');
        return false;
      }
    },
    [sdk],
  );

  const logoutFromProvider = useCallback(
    async (requireServerInvalidation = true) => {
      if (!sdk) {
        throw new Error(
          strings('deposit.configuration_modal.error_sdk_not_initialized'),
        );
      }

      requireServerInvalidation
        ? await sdk.logout()
        : await sdk
            .logout()
            .catch((error) =>
              Logger.error(
                error as Error,
                'SDK logout failed but invalidation was not required. Error:',
              ),
            );

      await resetProviderToken();
      setAuthToken(undefined);
      setIsAuthenticated(false);
      setUserDetails(null);
      setUserDetailsError(null);
    },
    [sdk],
  );

  const fetchUserDetails = useCallback(
    async ({ screenLocation, shouldTrackFetch }: FetchUserDetailsParams) => {
      if (!sdk || !isAuthenticated) {
        return;
      }

      if (isFetchingUserDetails) {
        return;
      }

      try {
        setIsFetchingUserDetails(true);
        setUserDetailsError(null);

        const result = await sdk.getUserDetails();
        setUserDetails(result);

        if (shouldTrackFetch) {
          trackEventCallback('RAMPS_USER_DETAILS_FETCHED', {
            logged_in: isAuthenticated,
            region:
              result?.address?.countryCode || selectedRegion?.isoCode || '',
            location: screenLocation || '',
          });
        }

        return result;
      } catch (error) {
        const errorMessage = (error as AxiosError).message;
        setUserDetailsError(errorMessage);

        if ((error as AxiosError).status === 401) {
          Logger.log('DepositSDK: 401 error, clearing authentication');
          await logoutFromProvider(false);
        }

        throw error;
      } finally {
        setIsFetchingUserDetails(false);
      }
    },
    [
      sdk,
      isAuthenticated,
      isFetchingUserDetails,
      logoutFromProvider,
      trackEventCallback,
      selectedRegion?.isoCode,
    ],
  );

  useEffect(() => {
    if (
      isAuthenticated &&
      sdk &&
      !userDetails &&
      !isFetchingUserDetails &&
      !userDetailsError
    ) {
      fetchUserDetails({ screenLocation: 'SDK Provider Auto-fetch' });
    }
  }, [
    isAuthenticated,
    sdk,
    userDetails,
    isFetchingUserDetails,
    userDetailsError,
    fetchUserDetails,
  ]);

  const contextValue = useMemo(
    (): DepositSDK => ({
      sdk,
      sdkError,
      providerApiKey,
      isAuthenticated,
      authToken,
      setAuthToken: setAuthTokenCallback,
      logoutFromProvider,
      checkExistingToken,
      getStarted,
      setGetStarted: setGetStartedCallback,
      selectedWalletAddress,
      selectedRegion,
      setSelectedRegion: setSelectedRegionCallback,
      selectedPaymentMethod,
      setSelectedPaymentMethod: setSelectedPaymentMethodCallback,
      selectedCryptoCurrency,
      setSelectedCryptoCurrency: setSelectedCryptoCurrencyCallback,
      userDetails,
      userDetailsError,
      isFetchingUserDetails,
      fetchUserDetails,
    }),
    [
      sdk,
      sdkError,
      providerApiKey,
      isAuthenticated,
      authToken,
      setAuthTokenCallback,
      logoutFromProvider,
      checkExistingToken,
      getStarted,
      setGetStartedCallback,
      selectedWalletAddress,
      selectedRegion,
      setSelectedRegionCallback,
      selectedPaymentMethod,
      setSelectedPaymentMethodCallback,
      selectedCryptoCurrency,
      setSelectedCryptoCurrencyCallback,
      userDetails,
      userDetailsError,
      isFetchingUserDetails,
      fetchUserDetails,
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
export const withDepositSDK = (Component: React.FC) => (props: any) => (
  <DepositSDKProvider>
    <Component {...props} />
  </DepositSDKProvider>
);
