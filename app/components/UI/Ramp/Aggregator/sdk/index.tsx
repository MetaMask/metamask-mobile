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
  Payment,
} from '@consensys/on-ramp-sdk';

import Logger from '../../../../../util/Logger';

import {
  fiatOrdersGetStartedAgg,
  setFiatOrdersGetStartedAGG,
  setFiatOrdersRegionAGG,
  fiatOrdersRegionSelectorAgg,
  fiatOrdersPaymentMethodSelectorAgg,
  setFiatOrdersPaymentMethodAGG,
  networkShortNameSelector,
  fiatOrdersGetStartedSell,
  setFiatOrdersGetStartedSell,
} from '../../../../../reducers/fiatOrders';
import { selectRampWalletAddress } from '../../../../../selectors/ramp';
import { RootState } from '../../../../../reducers';
import { RampIntent, RampType, Region } from '../types';

import I18n, { I18nEvents } from '../../../../../../locales/i18n';
import Device from '../../../../../util/device';
import useActivationKeys from '../hooks/useActivationKeys';
import { selectNickname } from '../../../../../selectors/networkController';

const isDevelopment =
  process.env.NODE_ENV !== 'production' ||
  process.env.RAMP_DEV_BUILD === 'true';
const isInternalBuild = process.env.RAMP_INTERNAL_BUILD === 'true';
const isDevelopmentOrInternalBuild = isDevelopment || isInternalBuild;

let environment = Environment.Production;
if (isInternalBuild) {
  environment = Environment.Staging;
} else if (isDevelopment) {
  environment = Environment.Development;
}

let context = Context.Mobile;
if (Device.isAndroid()) {
  context = Context.MobileAndroid;
} else if (Device.isIos()) {
  context = Context.MobileIOS;
}

export const SDK = OnRampSdk.create(environment, context, {
  verbose: isDevelopment,
  locale: I18n.locale,
});

I18nEvents.addListener('localeChanged', (locale) => {
  SDK.setLocale(locale);
});

interface RampSDKConfig {
  POLLING_INTERVAL: number;
  POLLING_INTERVAL_HIGHLIGHT: number;
  POLLING_CYCLES: number;
}

export interface RampSDK {
  sdk: RegionsService | undefined;
  sdkError?: Error;

  rampType: RampType;
  setRampType: (rampType: RampType) => void;

  intent: RampIntent | undefined;
  setIntent: (
    intentOrSetter:
      | RampIntent
      | ((previousIntent: RampIntent | undefined) => void)
      | undefined,
  ) => void;

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
  selectedNetworkName?: string;

  isBuy: boolean;
  isSell: boolean;

  appConfig: RampSDKConfig;
  callbackBaseUrl: string;
  isInternalBuild: boolean;
}

interface ProviderProps<T> {
  value?: T;
  rampType?: RampType;
  children?: React.ReactNode;
}

export const callbackBaseUrl = isDevelopment
  ? 'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback'
  : 'https://on-ramp-content.api.cx.metamask.io/regions/fake-callback';

export const callbackBaseDeeplink = 'metamask://';

const appConfig = {
  POLLING_INTERVAL: 20000,
  POLLING_INTERVAL_HIGHLIGHT: 10000,
  POLLING_CYCLES: 6,
};

const SDKContext = createContext<RampSDK | undefined>(undefined);

export const RampSDKProvider = ({
  value,
  rampType: providerRampType,
  ...props
}: ProviderProps<RampSDK>) => {
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
        Logger.error(error as Error, `RampSDKProvider SDK.regions() failed`);
        setSdkError(error as Error);
      }
    })();
  }, []);

  const sdk: RegionsService | undefined = useMemo(() => sdkModule, [sdkModule]);

  const dispatch = useDispatch();

  const INITIAL_SELECTED_REGION: Region | null = useSelector(
    fiatOrdersRegionSelectorAgg,
  );
  const INITIAL_GET_STARTED = useSelector(fiatOrdersGetStartedAgg);
  const INITIAL_GET_STARTED_SELL = useSelector(fiatOrdersGetStartedSell);
  const selectedNetworkNickname = useSelector(selectNickname);
  const selectedAggregatorNetworkName = useSelector(networkShortNameSelector);
  const selectedNetworkName =
    selectedNetworkNickname || selectedAggregatorNetworkName;

  const INITIAL_PAYMENT_METHOD_ID = useSelector(
    fiatOrdersPaymentMethodSelectorAgg,
  );
  const INITIAL_SELECTED_ASSET = null;

  const [rampType, setRampType] = useState(providerRampType ?? RampType.BUY);

  const [selectedRegion, setSelectedRegion] = useState(INITIAL_SELECTED_REGION);
  const [unsupportedRegion, setUnsupportedRegion] = useState<Region>();

  const [intent, setIntent] = useState<RampIntent>();

  const [selectedAsset, setSelectedAsset] = useState<CryptoCurrency | null>(
    INITIAL_SELECTED_ASSET,
  );
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(
    INITIAL_PAYMENT_METHOD_ID,
  );
  const [selectedFiatCurrencyId, setSelectedFiatCurrencyId] = useState<
    string | null
  >(null);
  const [getStarted, setGetStarted] = useState(
    (providerRampType ?? RampType.BUY) === RampType.BUY
      ? INITIAL_GET_STARTED
      : INITIAL_GET_STARTED_SELL,
  );

  const isBuy = rampType === RampType.BUY;
  const isSell = rampType === RampType.SELL;

  const selectedAddress = useSelector((state: RootState) =>
    selectRampWalletAddress(state, selectedAsset),
  );

  useEffect(() => {
    setSelectedRegion(INITIAL_SELECTED_REGION);
  }, [INITIAL_SELECTED_REGION]);

  const setSelectedRegionCallback = useCallback(
    (region: Region | null) => {
      dispatch(setFiatOrdersRegionAGG(region));
    },
    [dispatch],
  );

  const setSelectedPaymentMethodIdCallback = useCallback(
    (paymentMethodId: Payment['id'] | null) => {
      setSelectedPaymentMethodId(paymentMethodId);
      dispatch(setFiatOrdersPaymentMethodAGG(paymentMethodId));
    },
    [dispatch],
  );

  const setSelectedAssetCallback = useCallback((asset: CryptoCurrency) => {
    setSelectedAsset(asset);
  }, []);

  const setSelectedFiatCurrencyIdCallback = useCallback(
    (currencyId: string | null) => {
      setSelectedFiatCurrencyId(currencyId);
    },
    [],
  );

  const setGetStartedCallback = useCallback(
    (getStartedFlag: boolean) => {
      setGetStarted(getStartedFlag);
      if (rampType === RampType.BUY) {
        dispatch(setFiatOrdersGetStartedAGG(getStartedFlag));
      } else {
        dispatch(setFiatOrdersGetStartedSell(getStartedFlag));
      }
    },
    [dispatch, rampType],
  );

  const contextValue = useMemo(
    (): RampSDK => ({
      sdk,
      sdkError,

      rampType,
      setRampType,

      intent,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error - Ramps team ownership"
      setIntent,

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
      selectedNetworkName,

      isBuy,
      isSell,

      appConfig,
      callbackBaseUrl,
      isInternalBuild: isDevelopmentOrInternalBuild,
    }),
    [
      getStarted,
      isBuy,
      isSell,
      intent,
      setIntent,
      rampType,
      sdk,
      sdkError,
      selectedAddress,
      selectedAsset,
      selectedFiatCurrencyId,
      selectedNetworkName,
      selectedPaymentMethodId,
      selectedRegion,
      setGetStartedCallback,
      setSelectedAssetCallback,
      setSelectedFiatCurrencyIdCallback,
      setSelectedPaymentMethodIdCallback,
      setSelectedRegionCallback,
      unsupportedRegion,
    ],
  );

  return <SDKContext.Provider value={value || contextValue} {...props} />;
};

export const useRampSDK = () => {
  const contextValue = useContext(SDKContext);
  return contextValue as RampSDK;
};

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withRampSDK = (Component: React.FC) => (props: any) =>
  (
    <RampSDKProvider>
      <Component {...props} />
    </RampSDKProvider>
  );

export default SDKContext;
