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
interface IFiatOnRampSDKConfig {
  POLLING_INTERVAL: number;
  POLLING_INTERVAL_HIGHLIGHT: number;
  POLLING_CYCLES: number;
}

export interface IFiatOnRampSDK {
  sdk: RegionsService | undefined;
  sdkError?: Error;

  selectedRegion: Region | null;
  setSelectedRegion: (region: Region | null) => void;

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

  appConfig: IFiatOnRampSDKConfig;
  callbackBaseUrl: string;
}

interface IProviderProps<T> {
  value?: T;
  children?: React.ReactNode | undefined;
}

const isDevelopment = process.env.NODE_ENV !== 'production';
const VERBOSE_SDK = isDevelopment;

export const SDK = OnRampSdk.create(
  isDevelopment ? Environment.Staging : Environment.Production,
  Context.Mobile,
  {
    verbose: VERBOSE_SDK,
  },
);

export const callbackBaseUrl = isDevelopment
  ? 'https://on-ramp-content.metaswap-dev.codefi.network/regions/fake-callback'
  : 'https://on-ramp-content.metaswap.codefi.network/regions/fake-callback';

const appConfig = {
  POLLING_INTERVAL: 20000,
  POLLING_INTERVAL_HIGHLIGHT: 10000,
  POLLING_CYCLES: 3,
};

const SDKContext = createContext<IFiatOnRampSDK | undefined>(undefined);

export const FiatOnRampSDKProvider = ({
  value,
  ...props
}: IProviderProps<IFiatOnRampSDK>) => {
  const [sdkModule, setSdkModule] = useState<RegionsService>();
  const [sdkError, setSdkError] = useState<Error>();

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

  const INITIAL_PAYMENT_METHOD: string | null = useSelector(
    fiatOrdersPaymentMethodSelectorAgg,
  );
  const INITIAL_SELECTED_ASSET = null;

  const [selectedRegion, setSelectedRegion] = useState(INITIAL_SELECTED_REGION);
  const [selectedAsset, setSelectedAsset] = useState(INITIAL_SELECTED_ASSET);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(
    INITIAL_PAYMENT_METHOD,
  );
  const [selectedFiatCurrencyId, setSelectedFiatCurrencyId] = useState(null);
  const [getStarted, setGetStarted] = useState(INITIAL_GET_STARTED);

  const setSelectedRegionCallback = useCallback(
    (region) => {
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

  const contextValue: IFiatOnRampSDK = {
    sdk,
    sdkError,

    selectedRegion,
    setSelectedRegion: setSelectedRegionCallback,

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
  };

  return <SDKContext.Provider value={value || contextValue} {...props} />;
};

export const useFiatOnRampSDK = () => {
  const contextValue = useContext(SDKContext);
  return contextValue as IFiatOnRampSDK;
};

type NullifyOrPartial<T> = { [P in keyof T]?: T[P] | null };
type PartialParameters<T> = T extends (...args: infer P) => any
  ? NullifyOrPartial<P>
  : never;

interface config<T> {
  method: T;
  onMount?: boolean;
}
/**
 * useSDKMethod is a hook to conveniently call OnRampSdk.regions methods.
 *
 * @param config The method name or an object with the method name and a boolean onMount flag.
 * @param params The parameters to pass to the method.
 * @returns An array with an object with data, an error and a loading flag, and a function to call the method.
 *
 * @example
 * // Calling `getDefaultFiatCurrency` method
 * const [{ isFetching, error, data }] = useSDKMethod('getDefaultFiatCurrency', '/regions/cl');
 *
 * @example
 * // Calling `getDefaultFiatCurrency` method and get the function
 * const [{ isFetching, error, data }, getDefaultFiatCurrency] = useSDKMethod('getDefaultFiatCurrency', '/regions/cl');
 * // `getDefaultFiatCurrency` will be called with the same parameters
 * // by default (`/regions/cl` in this case)
 * const defaultCLFiatCurrency = await getDefaultFiatCurrency();
 * // Parameters can be overridden
 * const defaultARFiatCurrency = await getDefaultFiatCurrency('/regions/ar');
 * // The return and error of these calls will be reflected in the returned object of the hook
 */
export function useSDKMethod<T extends keyof RegionsService>(
  config: T | config<T>,
  ...params: PartialParameters<RegionsService[T]>
): [
  {
    data: Awaited<ReturnType<RegionsService[T]>> | null;
    error: string | null;
    isFetching: boolean;
  },
  (
    ...customParams: PartialParameters<RegionsService[T]> | []
  ) => Promise<any> | ReturnType<RegionsService[T]>,
] {
  const { sdk }: { sdk: RegionsService } = useFiatOnRampSDK() as any;
  const [data, setData] = useState<Awaited<
    ReturnType<RegionsService[T]>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const stringifiedParams = useMemo(() => JSON.stringify(params), [params]);
  const method = typeof config === 'string' ? config : config.method;
  const onMount = typeof config === 'string' ? true : config.onMount ?? true;

  const query = useCallback(
    async (...customParams: PartialParameters<RegionsService[T]> | []) => {
      if (
        (customParams.length > 0 && customParams.some((param) => !param)) ||
        (customParams.length === 0 &&
          params.length > 0 &&
          params.some((param) => !param))
      ) {
        return;
      }
      try {
        setIsFetching(true);
        setError(null);
        setData(null);
        if (sdk) {
          const response = await sdk[method](
            // @ts-expect-error spreading params error
            ...(customParams.length > 0 ? customParams : params),
          );
          // @ts-expect-error response type error
          setData(response);
          return response;
        }
      } catch (responseError) {
        Logger.error(responseError as Error, `useSDKMethod::${method} failed`);
        setError((responseError as Error).message);
      } finally {
        setIsFetching(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [method, stringifiedParams, sdk],
  );

  useEffect(() => {
    if (onMount) {
      query();
    } else {
      setIsFetching(false);
    }
  }, [query, onMount]);

  return [{ data, error, isFetching }, query];
}

export const withFiatOnRampSDK = (Component: React.FC) => (props: any) =>
  (
    <FiatOnRampSDKProvider>
      <Component {...props} />
    </FiatOnRampSDKProvider>
  );

export default SDKContext;
