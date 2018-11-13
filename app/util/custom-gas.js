import { BN } from 'ethereumjs-util';
import { fromWei, weiToFiat } from './number';

export function apiEstimateModifiedToWEI(estimate) {
	return estimate * 100000000;
}

export function getRenderableEthFee(estimate, gasLimit = 21000) {
	const apiEstimate = apiEstimateModifiedToWEI(estimate);
	const gasFee = apiEstimate * gasLimit;
	const eth = fromWei(gasFee);
	return eth;
}

export function getRenderableGweiFiat(estimate, conversionRate, currencyCode) {
	const wei = apiEstimateModifiedToWEI(estimate);
	const fiat = weiToFiat(new BN(wei), conversionRate, currencyCode);
	return fiat;
}
