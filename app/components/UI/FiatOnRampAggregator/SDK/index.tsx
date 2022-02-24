import React, { useState, useCallback, useEffect, createContext, useContext, ProviderProps, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { OnRampSdk, IOnRampSdk } from '@codefi/on-ramp-sdk';
import { fiatOrdersCountrySelectorAgg, setFiatOrdersCountryAGG } from '../../../../reducers/fiatOrders';
export interface IFiatOnRampSDK {
	sdk: IOnRampSdk;
	setSelectedCountry: (countryCode: string) => void;
	selectedCountry: string;
	setSelectedRegion: (countryCode: string) => void;
	selectedRegion: string;
	setSelectedPaymentMethod: (paymentMethod: string) => void;
	selectedPaymentMethod: string;
	setRegionCurrency: (currency: string) => void;
	regionCurrency: string;
	setSelectedAsset: (asset: string) => void;
	selectedAsset: string;
}

const SDKContext = createContext<IFiatOnRampSDK | undefined>(undefined);

export const FiatOnRampSDKProvider = ({ value, ...props }: ProviderProps<IFiatOnRampSDK>) => {
	const sdk: IOnRampSdk = useMemo(() => new OnRampSdk(), []);

	useEffect(() => {
		if (sdk) sdk.init();
	}, [sdk]);

	const dispatch = useDispatch();

	const INITIAL_SELECTED_COUNTRY: string = useSelector(fiatOrdersCountrySelectorAgg);
	const INITIAL_SELECTED_REGION = INITIAL_SELECTED_COUNTRY;
	const INITIAL_PAYMENT_METHOD = '/payments/debit-credit-card';
	const INITIAL_SELECTED_ASSET = 'ETH';

	const [selectedCountry, setSelectedCountry] = useState(INITIAL_SELECTED_COUNTRY);
	const [selectedRegion, setSelectedRegion] = useState(INITIAL_SELECTED_REGION);
	const [selectedAsset, setSelectedAsset] = useState(INITIAL_SELECTED_ASSET);
	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(INITIAL_PAYMENT_METHOD);
	const [regionCurrency, setRegionCurrency] = useState('USD');

	const setSelectedCountryCallback = useCallback(
		(countryCode) => {
			setSelectedCountry(countryCode);
			// we need always to replicate the country selection and mirror it to region selection for all countries excpet USA.
			if (countryCode !== 'us') {
				setSelectedRegion(countryCode);
				// update redux store by dispatching an action
				dispatch(setFiatOrdersCountryAGG(countryCode));
			}
		},
		[dispatch]
	);

	const setSelectedRegionCallback = useCallback(
		(countryCode) => {
			setSelectedRegion(countryCode);
			// update redux store by dispatching an action
			dispatch(setFiatOrdersCountryAGG(countryCode));
		},
		[dispatch]
	);

	const setRegionCurrencyCallback = useCallback((currency) => {
		setRegionCurrency(currency);
		// dispatch an action to redux store to update region currency
		// TODO: dispatch(setRegionCurrency(currency));
	}, []);

	const setSelectedPaymentMethodCallback = useCallback((paymentMethod) => {
		setSelectedPaymentMethod(paymentMethod);
	}, []);

	const setSelectedAssetCallback = useCallback((asset) => {
		setSelectedAsset(asset);
	}, []);

	const contextValue: IFiatOnRampSDK = {
		sdk,
		setSelectedCountry: setSelectedCountryCallback,
		selectedCountry,
		setSelectedRegion: setSelectedRegionCallback,
		selectedRegion,
		setSelectedPaymentMethod: setSelectedPaymentMethodCallback,
		selectedPaymentMethod,
		setRegionCurrency: setRegionCurrencyCallback,
		regionCurrency,
		setSelectedAsset: setSelectedAssetCallback,
		selectedAsset,
	};

	return <SDKContext.Provider value={value || contextValue} {...props} />;
};

export const useFiatOnRampSDK = () => {
	const contextValue = useContext(SDKContext);
	return contextValue as IFiatOnRampSDK;
};

interface config<T> {
	method: T;
	onMount?: boolean;
}

export function useSDKMethod<T extends keyof IOnRampSdk>(
	config: T | config<T>,
	...params: Parameters<IOnRampSdk[T]>
): [{ data: any; error: string | null; isFetching: boolean }, () => Promise<void>] {
	const { sdk }: { sdk: IOnRampSdk } = useFiatOnRampSDK() as any;
	const [data, setData] = useState<any | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isFetching, setIsFetching] = useState<boolean>(true);
	const stringifiedParams = useMemo(() => JSON.stringify(params), [params]);
	const method = typeof config === 'string' ? config : config.method;
	const onMount = typeof config === 'string' ? true : config.onMount ?? true;

	const query = useCallback(async () => {
		try {
			setIsFetching(true);
			// @ts-expect-error spreading params error
			const sdkMethod = (...a) => sdk[method](...a);
			const response = await sdkMethod(...params);
			setData(response);
		} catch (responseError) {
			// logging maybe
			setError((responseError as Error).message);
		} finally {
			setIsFetching(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [method, stringifiedParams, sdk]);

	useEffect(() => {
		if (onMount) {
			query();
		}
	}, [query, onMount]);

	return [{ data, error, isFetching }, query];
}

export default SDKContext;
