import React, {
  useState,
  useCallback,
  useEffect,
  createContext,
  useContext,
  useMemo,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  OnRampSdk,
  Environment,
  Context,
  RegionsService,
  CryptoCurrency,
} from '@consensys/on-ramp-sdk';

import Logger from '../../../../util/Logger';

import {
  selectedAddressSelector,
  chainIdSelector,
  fiatOrdersGetStartedAgg,
  setFiatOrdersGetStartedAGG,
  setFiatOrdersRegionAGG,
  fiatOrdersRegionSelectorAgg,
  fiatOrdersPaymentMethodSelectorAgg,
  setFiatOrdersPaymentMethodAGG,
} from '../../../../reducers/fiatOrders';
import { Region } from '../types';

import I18n, { I18nEvents } from '../../../../../locales/i18n';
import Device from '../../../../util/device';
import useActivationKeys from '../hooks/useActivationKeys';

interface OnRampSDKConfig {
  POLLING_INTERVAL: number;
  POLLING_INTERVAL_HIGHLIGHT: number;
  POLLING_CYCLES: number;
}

export interface OnRampSDK {
  sdk: RegionsService | undefined;
  sdkError?: Error;

  selectedRegion: Region | null;
  setSelectedRegion: (region: Region | null) => void;

  unsupportedRegion?: Region;
  setUnsupportedRegion: (region?: Region) => void;

  selectedPaymentMethodId: string | null;
  setSelectedPaymentMethodId: (paymentMethodId: string | null) => void;

  selectedAsset: CryptoCurrency | null;
  setSelectedAsset: (asset: CryptoCurrency) => void;

  selectedFiatCurrencyId: string | null;
  setSelectedFiatCurrencyId: (currencyId: string | null) => void;

  getStarted: boolean;
  setGetStarted: (getStartedFlag: boolean) => void;

  selectedAddress: string;
  selectedChainId: string;

  appConfig: OnRampSDKConfig;
  callbackBaseUrl: string;
  isInternalBuild: boolean;
}

interface IProviderProps<T> {
  value?: T;
  children?: React.ReactNode | undefined;
}

const isDevelopment = process.env.NODE_ENV !== 'production';
const isInternalBuild = process.env.ONRAMP_INTERNAL_BUILD === 'true';
const isDevelopmentOrInternalBuild = isDevelopment || isInternalBuild;

const CONTEXT = Device.isAndroid()
  ? Context.MobileAndroid
  : Device.isIos()
  ? Context.MobileIOS
  : Context.Mobile;
const VERBOSE_SDK = isDevelopment;

export const SDK = OnRampSdk.create(
  isDevelopmentOrInternalBuild ? Environment.Staging : Environment.Production,
  CONTEXT,
  {
    verbose: VERBOSE_SDK,
    locale: I18n.locale,
  },
);

I18nEvents.addListener('localeChanged', (locale) => {
  SDK.setLocale(locale);
});

export const callbackBaseUrl = isDevelopment
  ? 'https://on-ramp.metaswap-dev.codefi.network/regions/fake-callback'
  : 'https://on-ramp-content.metaswap.codefi.network/regions/fake-callback';

export const callbackBaseDeeplink = 'metamask://';

const appConfig = {
  POLLING_INTERVAL: 20000,
  POLLING_INTERVAL_HIGHLIGHT: 10000,
  POLLING_CYCLES: 6,
};

const SDKContext = createContext<OnRampSDK | undefined>(undefined);

export const FiatOnRampSDKProvider = ({
  value,
  ...props
}: IProviderProps<OnRampSDK>) => {
  const [sdkModule, setSdkModule] = useState<RegionsService>();
  const [sdkError, setSdkError] = useState<Error>();
  useActivationKeys({
    provider: true,
    internal: isDevelopmentOrInternalBuild,
  });

  useEffect(() => {
    (async () => {
      try {
        const sdk = await SDK.regions();
        setSdkModule(sdk);
      } catch (error) {
        Logger.error(
          error as Error,
          `FiatOnRampSDKProvider SDK.regions() failed`,
        );
        setSdkError(error as Error);
      }
    })();
  }, []);

  const sdk: RegionsService | undefined = useMemo(() => sdkModule, [sdkModule]);

  const dispatch = useDispatch();

  const INITIAL_SELECTED_REGION: Region | null = useSelector(
    fiatOrdersRegionSelectorAgg,
  );
  const INITIAL_GET_STARTED: boolean = useSelector(fiatOrdersGetStartedAgg);
  const selectedAddress: string = useSelector(selectedAddressSelector);
  const selectedChainId: string = useSelector(chainIdSelector);

  const INITIAL_PAYMENT_METHOD_ID: string | null = useSelector(
    fiatOrdersPaymentMethodSelectorAgg,
  );
  const INITIAL_SELECTED_ASSET = null;

  const [selectedRegion, setSelectedRegion] = useState(INITIAL_SELECTED_REGION);
  const [unsupportedRegion, setUnsupportedRegion] = useState<Region>();

  const [selectedAsset, setSelectedAsset] = useState(INITIAL_SELECTED_ASSET);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(
    INITIAL_PAYMENT_METHOD_ID,
  );
  const [selectedFiatCurrencyId, setSelectedFiatCurrencyId] = useState(null);
  const [getStarted, setGetStarted] = useState(INITIAL_GET_STARTED);

  const setSelectedRegionCallback = useCallback(
    (region: Region | null) => {
      setSelectedRegion(region);
      dispatch(setFiatOrdersRegionAGG(region));
    },
    [dispatch],
  );

  const setSelectedPaymentMethodIdCallback = useCallback(
    (paymentMethodId) => {
      setSelectedPaymentMethodId(paymentMethodId);
      dispatch(setFiatOrdersPaymentMethodAGG(paymentMethodId));
    },
    [dispatch],
  );

  const setSelectedAssetCallback = useCallback((asset) => {
    setSelectedAsset(asset);
  }, []);

  const setSelectedFiatCurrencyIdCallback = useCallback((currencyId) => {
    setSelectedFiatCurrencyId(currencyId);
  }, []);

  const setGetStartedCallback = useCallback(
    (getStartedFlag) => {
      setGetStarted(getStartedFlag);
      dispatch(setFiatOrdersGetStartedAGG(getStartedFlag));
    },
    [dispatch],
  );

  const contextValue: OnRampSDK = {
    sdk,
    sdkError,

    selectedRegion,
    setSelectedRegion: setSelectedRegionCallback,

    unsupportedRegion,
    setUnsupportedRegion,

    selectedPaymentMethodId,
    setSelectedPaymentMethodId: setSelectedPaymentMethodIdCallback,

    selectedAsset,
    setSelectedAsset: setSelectedAssetCallback,

    selectedFiatCurrencyId,
    setSelectedFiatCurrencyId: setSelectedFiatCurrencyIdCallback,

    getStarted,
    setGetStarted: setGetStartedCallback,

    selectedAddress,
    selectedChainId,

    appConfig,
    callbackBaseUrl,
    isInternalBuild: isDevelopmentOrInternalBuild,
  };

  return <SDKContext.Provider value={value || contextValue} {...props} />;
};

export const useFiatOnRampSDK = () => {
  const contextValue = useContext(SDKContext);
  return contextValue as OnRampSDK;
};

export const withFiatOnRampSDK = (Component: React.FC) => (props: any) =>
  (
    <FiatOnRampSDKProvider>
      <Component {...props} />
    </FiatOnRampSDKProvider>
  );

export default SDKContext;
