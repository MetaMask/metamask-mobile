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
  fiatOrdersRegionSelectorDeposit,
  setFiatOrdersRegionDeposit,
  fiatOrdersCryptoCurrencySelectorDeposit,
  setFiatOrdersCryptoCurrencyDeposit,
  fiatOrdersPaymentMethodSelectorDeposit,
  setFiatOrdersPaymentMethodDeposit,
} from '../../../../../reducers/fiatOrders';
import Logger from '../../../../../util/Logger';
import I18n, { I18nEvents, strings } from '../../../../../../locales/i18n';
import useRampAccountAddress from '../../hooks/useRampAccountAddress';
import { DepositNavigationParams } from '../types';
import useRampsUnifiedV2Enabled from '../../hooks/useRampsUnifiedV2Enabled';
import Engine from '../../../../../core/Engine';

export interface DepositSDK {
  sdk?: NativeRampsSdk;
  sdkError?: Error;
  providerApiKey: string | null;
  isAuthenticated: boolean;
  authToken?: NativeTransakAccessToken;
  setAuthToken: (token: NativeTransakAccessToken) => Promise<boolean>;
  logoutFromProvider: (requireServerInvalidation?: boolean) => Promise<void>;
  checkExistingToken: () => Promise<boolean>;

  selectedWalletAddress: string | null;
  selectedRegion: DepositRegion | null;
  setSelectedRegion: (region: DepositRegion | null) => void;
  selectedPaymentMethod: DepositPaymentMethod | null;
  setSelectedPaymentMethod: (paymentMethod: DepositPaymentMethod) => void;
  selectedCryptoCurrency: DepositCryptoCurrency | null;
  setSelectedCryptoCurrency: (cryptoCurrency: DepositCryptoCurrency) => void;
  intent?: DepositNavigationParams;
  setIntent: (
    intentOrSetter:
      | DepositNavigationParams
      | ((
          previousIntent: DepositNavigationParams | undefined,
        ) => DepositNavigationParams | undefined)
      | undefined,
  ) => void;
}

const environment = getSdkEnvironment();

const context =
  Platform.OS === 'ios' ? Context.MobileIOS : Context.MobileAndroid;
export const DEPOSIT_ENVIRONMENT = environment;
export const DepositSDKNoAuth = new NativeRampsSdk(
  {
    context,
    locale: I18n.locale,
  },
  environment,
);

I18nEvents.addListener('localeChanged', (locale) => {
  DepositSDKNoAuth.setLocale(locale);
});

export const DepositSDKContext = createContext<DepositSDK | undefined>(
  undefined,
);

export const DepositSDKProvider = ({
  value,
  ...props
}: Partial<ProviderProps<DepositSDK>>) => {
  const dispatch = useDispatch();
  const providerApiKey = useSelector(selectDepositProviderApiKey);
  const isRampsUnifiedV2Enabled = useRampsUnifiedV2Enabled();

  const [sdk, setSdk] = useState<NativeRampsSdk>();
  const [sdkError, setSdkError] = useState<Error>();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<NativeTransakAccessToken>();
  const [intent, setIntent] = useState<DepositNavigationParams | undefined>(
    undefined,
  );

  const INITIAL_SELECTED_REGION: DepositRegion | null = useSelector(
    fiatOrdersRegionSelectorDeposit,
  );
  const INITIAL_SELECTED_CRYPTO_CURRENCY: DepositCryptoCurrency | null =
    useSelector(fiatOrdersCryptoCurrencySelectorDeposit);
  const INITIAL_SELECTED_PAYMENT_METHOD: DepositPaymentMethod | null =
    useSelector(fiatOrdersPaymentMethodSelectorDeposit);

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

  const setSelectedRegionCallback = useCallback(
    (region: DepositRegion | null) => {
      setSelectedRegion(region);
      dispatch(setFiatOrdersRegionDeposit(region));
    },
    [dispatch],
  );

  const setSelectedCryptoCurrencyCallback = useCallback(
    (cryptoCurrency: DepositCryptoCurrency | null) => {
      console.log('[DepositSDK] setSelectedCryptoCurrencyCallback called:', {
        assetId: cryptoCurrency?.assetId ?? null,
        symbol: cryptoCurrency?.symbol ?? null,
        chainId: cryptoCurrency?.chainId ?? null,
        isRampsUnifiedV2Enabled,
      });
      setSelectedCryptoCurrency(cryptoCurrency);
      dispatch(setFiatOrdersCryptoCurrencyDeposit(cryptoCurrency));

      if (isRampsUnifiedV2Enabled) {
        if(cryptoCurrency?.assetId) {
          Engine.context.RampsController.setSelectedToken(cryptoCurrency.assetId);
        } else {
          throw new Error('Crypto currency asset ID is required');
        }
      }
    },
    [dispatch, isRampsUnifiedV2Enabled],
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
          locale: I18n.locale,
        },
        environment,
      );

      setSdk(sdkInstance);
    } catch (error) {
      setSdkError(error as Error);
    }
  }, [providerApiKey]);

  // Listen for locale changes and update SDK locale
  useEffect(() => {
    if (!sdk) return;

    const handleLocaleChange = (locale: string) => {
      sdk.setLocale(locale);
    };
    I18nEvents.addListener('localeChanged', handleLocaleChange);
    return () => {
      I18nEvents.removeListener('localeChanged', handleLocaleChange);
    };
  }, [sdk]);

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
            .catch((error: Error) =>
              Logger.error(
                error as Error,
                'SDK logout failed but invalidation was not required. Error:',
              ),
            );

      await resetProviderToken();
      setAuthToken(undefined);
      setIsAuthenticated(false);
    },
    [sdk],
  );

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
      selectedWalletAddress,
      selectedRegion,
      setSelectedRegion: setSelectedRegionCallback,
      selectedPaymentMethod,
      setSelectedPaymentMethod: setSelectedPaymentMethodCallback,
      selectedCryptoCurrency,
      setSelectedCryptoCurrency: setSelectedCryptoCurrencyCallback,
      intent,
      setIntent,
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
      selectedWalletAddress,
      selectedRegion,
      setSelectedRegionCallback,
      selectedPaymentMethod,
      setSelectedPaymentMethodCallback,
      selectedCryptoCurrency,
      setSelectedCryptoCurrencyCallback,
      intent,
      setIntent,
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
