import React, { useState, useCallback, useEffect, createContext, useContext, ProviderProps, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fiatOrdersCountrySelectorAgg, setFiatOrdersCountryAGG } from '../../../../reducers/fiatOrders';
import { IOnRampSdk } from './IOnRampSdk';
import SDK from './MockedOnRampSdk';

const SDKContext = createContext<IOnRampSdk | undefined>(undefined);

export const FiatOnRampSDKProvider = ({ value, ...props }: ProviderProps<IOnRampSdk>) => {
	const sdk = useMemo(() => new SDK(), []);
	return <SDKContext.Provider value={value || sdk} {...props} />;
};

export const useFiatOnRampSDK = () => {
	const sdk = useContext(SDKContext);
	const dispatch = useDispatch();

	const INITIAL_SELECTED_COUNTRY = useSelector(fiatOrdersCountrySelectorAgg);
	const INITIAL_SELECTED_REGION = INITIAL_SELECTED_COUNTRY;
	// const INITIAL_PAYMENT_METHOD = '/payments/debit-credit-card';
	const INITIAL_SELECTED_ASSET = {
		address: '',
		aggregators: ['aave'],
		decimals: 18,
		iconUrl: 'https://crypto.com/price/coin-data/icon/ETH/color_icon.png',
		name: 'Ethereum',
		occurrences: 11,
		symbol: 'ETH',
		network: 'ethereum',
	};

	const [selectedCountry, setSelectedCountry] = useState<string>(INITIAL_SELECTED_COUNTRY);
	const [selectedRegion, setSelectedRegion] = useState<string>(INITIAL_SELECTED_REGION);
	const [selectedAsset, setSelectedAsset] = useState<any>(INITIAL_SELECTED_ASSET);
	const [regionCurrency, setRegionCurrency] = useState<string>('USD');

	const setSelectedCountryCallback = useCallback(
		(countryCode) => {
			setSelectedCountry(countryCode);
			// we need always to replicate the country selection and mirror it to region selection for all countries excpet USA.
			if (countryCode !== 'USA') {
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

	return {
		sdk,
		setSelectedCountry: setSelectedCountryCallback,
		selectedCountry,
		setSelectedRegion: setSelectedRegionCallback,
		selectedRegion,
		setRegionCurrency: setRegionCurrencyCallback,
		regionCurrency,
		setSelectedAsset,
		selectedAsset,
	};
};

export function useSDKMethod<T extends keyof IOnRampSdk>(
	method: T,
	...params: Parameters<IOnRampSdk[T]>
): [{ data: any; error: string | null; isFetching: boolean }, () => Promise<void>] {
	const { sdk }: { sdk: IOnRampSdk } = useFiatOnRampSDK() as any;
	const [data, setData] = useState<any | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isFetching, setIsFetching] = useState<boolean>(false);
	const stringifiedParams = useMemo(() => JSON.stringify(params), [params]);

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
		query();
	}, [query]);

	return [{ data, error, isFetching }, query];
}

export default SDKContext;
