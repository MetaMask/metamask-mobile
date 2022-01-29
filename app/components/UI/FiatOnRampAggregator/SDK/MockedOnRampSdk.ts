/* eslint-disable @typescript-eslint/no-unused-vars */
import { IOnRampSdk, Location } from './IOnRampSdk';

class MockedOnRampSdk implements IOnRampSdk {
	init(): Promise<void> {
		return Promise.resolve();
	}

	async getCountry(id: string): Promise<any> {
		return (await this.getCountries()).filter((c) => c.id === id)[0];
	}

	getCountries(): Promise<any[]> {
		return Promise.resolve([
			{
				id: '/countries/us',
				name: 'United States of America',
				currency: '/currencies/fiat/usd',
				regions: [
					{ id: '/countries/us/regions/alabama', name: 'Alabama' },
					{ id: '/countries/us/regions/alaska', name: 'Alaska' },
					{ id: '/countries/us/regions/arizona', name: 'Arizona' },
					{ id: '/countries/us/regions/arkansas', name: 'Arkansas' },
					{ id: '/countries/us/regions/california', name: 'California' },
					{
						id: '/countries/us/regions/new-york',
						name: 'New York',
						unsupported: true,
					},
				],
			},
			{
				id: '/countries/france',
				name: 'France',
				currency: 'currencies/fiat/eur',
			},
		]);
	}

	async getRegions(countryId: string): Promise<any[]> {
		return (await this.getCountry(countryId))?.regions;
	}

	getPaymentMethods(location: Location): Promise<any[]> {
		return Promise.resolve([
			{
				id: '/payments/debit-credit-card',
				name: 'Debit or Credit Card',
				logo: '',
				delay: 'mediumDeposit',
				amountTier: 1,
			},
		]);
	}

	async getPaymentMethod(location: Location, id: string): Promise<any[]> {
		return (await this.getPaymentMethods(location)).filter((p) => p.id === id)[0];
	}

	getCryptoCurrencies(location: Location, paymentMethodId: string): Promise<any[]> {
		return Promise.resolve([
			{ id: '/currencies/crypto/usdc', symbol: 'USDC' },
			{ id: '/currencies/crypto/usdt', symbol: 'USDT' },
			{ id: '/currencies/crypto/eth', symbol: 'ETH' },
		]);
	}

	getFiatCurrencies(location: Location, paymentMethodId: string): Promise<any[]> {
		return Promise.resolve([
			{ id: '/currencies/fiat/usd', symbol: 'USD' },
			{ id: '/currencies/fiat/eur', symbol: 'EUR' },
			{ id: '/currencies/fiat/gbp', symbol: 'GBP' },
		]);
	}

	getProviders(location: Location, paymentMethod: string, crypto: string, fiat: string, amount: number) {
		return Promise.resolve([
			[
				'/providers/transak',
				{
					id: '/providers/transak',
					quote: 'https://staging-api.transak.com/api/v2/currencies/price?fiatCurrency={fiatCurrency}&cryptoCurrency={cryptoCurrency}&isBuyOrSell={isBuyOrSell}&paymentMethod={paymentMethod}&network={network}',
					supportedCryptoCurrencies: [
						'/currencies/crypto/usdc',
						'/currencies/crypto/usdt',
						'/currencies/crypto/eth',
					],
					supportedFiatCurrencies: ['/currencies/fiat/usd', '/currencies/fiat/eur'],
					supportedCountries: [
						{ id: '/countries/algeria' },
						{ id: '/countries/argentina' },
						{
							id: '/countries/canada',
							regions: [
								'/countries/canada/regions/alberta',
								'/countries/canada/regions/british-columbia',
								'/countries/canada/regions/manitoba',
							],
						},
						{ id: '/countries/fr' },
						{
							id: '/countries/us',
							regions: [
								'/countries/us/regions/new-york',
								'/countries/us/regions/alaska',
								'/countries/us/regions/arizona',
								'/countries/us/regions/arkansas',
								'/countries/us/regions/california',
							],
						},
					],
					quoteTransformation: {
						crypto: 'response.cryptoCurrency',
						fiat: 'response.fiatCurrency',
						amountIn: 'response.fiatAmount',
						amountOut: 'response.cryptoAmount',
					},
					data: {
						apiKey: 'ebbeabce-0dc7-4aed-90b0-dec30f717264',
						environment: 'STAGING',
					},
				},
			],
			[
				'/providers/wyre',
				{
					id: '/providers/wyre',
					quote: '',
					supportedCryptoCurrencies: [
						'/currencies/crypto/usdc',
						'/currencies/crypto/usdt',
						'/currencies/crypto/eth',
						'/currencies/crypto/bnb',
						'/currencies/crypto/avax',
					],
					supportedFiatCurrencies: ['/currencies/fiat/usd', '/currencies/fiat/eur'],
					supportedCountries: [
						{ id: '/countries/algeria' },
						{ id: '/countries/argentina' },
						{
							id: '/countries/canada',
							regions: [
								'/countries/canada/regions/alberta',
								'/countries/canada/regions/british-columbia',
								'/countries/canada/regions/manitoba',
							],
						},
						{ id: '/countries/fr' },
					],
					quoteTransformation: {
						crypto: 'response.cryptoCurrency',
						fiat: 'response.fiatCurrency',
						amountIn: 'response.fiatAmount',
						amountOut: 'response.cryptoAmount',
					},
					data: {},
				},
			],
		]);
	}

	getQuote(
		providerId: string,
		location: Location,
		paymentMethod: string,
		crypto: string,
		network: string,
		fiat: string,
		amount: number
	): Promise<any> {
		return Promise.resolve({
			providerId: '/providers/transak',
			providerName: 'Transak',
			cryptoOut: {
				currency: '/currencies/crypto/usdt',
				amount: 279.34,
			},
			fiatOut: {
				currency: '/currencies/fiat/usd',
				amount: 279.71,
			},
			fees: {
				total: {
					currency: '/currencies/fiat/usd',
					amount: 20.29,
				},
			},
			total: {
				currency: '/currencies/fiat/usd',
				amount: 300,
			},
		});
	}

	getQuotes(
		location: Location,
		paymentMethod: string,
		crypto: string,
		network: string,
		fiat: string,
		amount: number
	): Promise<any> {
		return Promise.resolve([
			{
				providerId: '/providers/moonpay',
				providerName: 'MoonPay',
				cryptoOut: {
					currency: '/currencies/crypto/usdt',
					amount: 280.17,
				},
				fiatOut: {
					currency: '/currencies/fiat/usd',
					amount: 280.54,
				},
				fees: {
					total: {
						currency: '/currencies/fiat/usd',
						amount: 19.46,
					},
				},
				total: {
					currency: '/currencies/fiat/usd',
					amount: 300,
				},
			},
			{
				providerId: '/providers/transak',
				providerName: 'Transak',
				cryptoOut: {
					currency: '/currencies/crypto/usdt',
					amount: 279.34,
				},
				fiatOut: {
					currency: '/currencies/fiat/usd',
					amount: 279.71,
				},
				fees: {
					total: {
						currency: '/currencies/fiat/usd',
						amount: 20.29,
					},
				},
				total: {
					currency: '/currencies/fiat/usd',
					amount: 300,
				},
			},
			{
				providerId: '/providers/wyre',
				providerName: 'Wyre',
				cryptoOut: {
					currency: '/currencies/crypto/usdt',
					amount: 274.85,
				},
				fiatOut: {
					currency: '/currencies/fiat/usd',
					amount: 275.24,
				},
				fees: {
					total: {
						currency: '/currencies/fiat/usd',
						amount: 24.76,
					},
				},
				total: {
					currency: '/currencies/fiat/usd',
					amount: 300,
				},
			},
		]);
	}

	buildTransakSdkParameters(
		location: Location,
		paymentMethod: string,
		crypto: string,
		network: string,
		fiat: string,
		amount: number
	): Promise<any> {
		return Promise.resolve({
			apiKey: 'MOCK_API_KEY', // Your API Key
			environment: 'STAGING', // STAGING/PRODUCTION
			defaultCryptoCurrency: crypto,
			walletAddress: '', // Your customer's wallet address
			themeColor: '000000', // App theme color
			fiatCurrency: fiat, // INR/GBP
			email: '', // Your customer's email address
			redirectURL: '',
			// hostURL: window.location.origin,
			widgetHeight: '550px',
			widgetWidth: '450px',
		});
	}
}

export default MockedOnRampSdk;
