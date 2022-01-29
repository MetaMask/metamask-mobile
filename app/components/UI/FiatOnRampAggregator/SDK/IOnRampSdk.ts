export interface Location {
	countryId: string;
	regionId?: string;
}

export interface IOnRampSdk {
	init(): Promise<void>;
	getCountry(id: string): Promise<any>;
	getCountries(): Promise<any[]>;
	getRegions(countryId: string): Promise<any[]>;
	getPaymentMethods(location: Location): Promise<any[]>;
	getPaymentMethod(location: Location, id: string): Promise<any[]>;
	getCryptoCurrencies(location: Location, paymentMethodId: string): Promise<any[]>;
	getFiatCurrencies(location: Location, paymentMethodId: string): Promise<any[]>;
	getProviders(
		location: Location,
		paymentMethod: string,
		crypto: string,
		fiat: string,
		amount: number
	): Promise<any[]>;
	getQuote(
		providerId: string,
		location: Location,
		paymentMethod: string,
		crypto: string,
		network: string,
		fiat: string,
		amount: number
	): Promise<any>;
	getQuotes(
		location: Location,
		paymentMethod: string,
		crypto: string,
		network: string,
		fiat: string,
		amount: number
	): Promise<any>;
	buildTransakSdkParameters(
		location: Location,
		paymentMethod: string,
		crypto: string,
		network: string,
		fiat: string,
		amount: number
	): Promise<any>;
}
