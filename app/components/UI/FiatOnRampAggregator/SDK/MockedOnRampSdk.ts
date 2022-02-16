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
			{
				address: '',
				aggregators: ['aave'],
				decimals: 18,
				iconUrl: 'https://crypto.com/price/coin-data/icon/ETH/color_icon.png',
				name: 'Ethereum',
				occurrences: 11,
				symbol: 'ETH',
				network: 'ethereum',
			},
			{
				address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
				aggregators: [
					'aave',
					'bancor',
					'cmc',
					'cryptocom',
					'coinGecko',
					'oneInch',
					'paraswap',
					'pmm',
					'synthetix',
					'zapper',
					'zerion',
					'zeroEx',
				],
				decimals: 18,
				iconUrl: 'https://assets.coingecko.com/coins/images/3406/large/SNX.png',
				name: 'Synthetix Network Token',
				occurrences: 12,
				symbol: 'SNX',
				network: 'ethereum',
			},
			{
				address: '0x6b175474e89094c44da98b954eedeac495271d0f',
				aggregators: [
					'aave',
					'bancor',
					'cmc',
					'cryptocom',
					'coinGecko',
					'oneInch',
					'paraswap',
					'pmm',
					'zapper',
					'zerion',
					'zeroEx',
				],
				decimals: 18,
				iconUrl: 'https://crypto.com/price/coin-data/icon/DAI/color_icon.png',
				name: 'Dai Stablecoin',
				occurrences: 11,
				symbol: 'DAI',
				network: 'ethereum',
			},
			{
				address: '0x514910771af9ca656af840dff83e8264ecf986ca',
				aggregators: [
					'aave',
					'bancor',
					'cmc',
					'cryptocom',
					'coinGecko',
					'oneInch',
					'paraswap',
					'pmm',
					'zapper',
					'zerion',
					'zeroEx',
				],
				decimals: 18,
				iconUrl: 'https://crypto.com/price/coin-data/icon/LINK/color_icon.png',
				name: 'Chainlink Token',
				occurrences: 11,
				symbol: 'LINK',
				network: 'ethereum',
			},
			{
				address: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
				aggregators: [
					'aave',
					'bancor',
					'cmc',
					'cryptocom',
					'coinGecko',
					'oneInch',
					'paraswap',
					'pmm',
					'zapper',
					'zerion',
					'zeroEx',
				],
				decimals: 18,
				iconUrl: 'https://crypto.com/price/coin-data/icon/MKR/color_icon.png',
				name: 'Maker',
				occurrences: 11,
				symbol: 'MKR',
				network: 'ethereum',
			},
			{
				address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
				aggregators: [
					'aave',
					'bancor',
					'cmc',
					'cryptocom',
					'coinGecko',
					'oneInch',
					'paraswap',
					'pmm',
					'zapper',
					'zerion',
					'zeroEx',
				],
				decimals: 8,
				iconUrl:
					'https://images.prismic.io/token-price-prod/c27778b1-f402-45f0-9225-f24f24b0518a_WBTC-xxxhdpi.png',
				name: 'Wrapped BTC',
				occurrences: 11,
				symbol: 'WBTC',
				network: 'ethereum',
			},
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
