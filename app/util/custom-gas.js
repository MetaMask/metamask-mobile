import { BN } from 'ethereumjs-util';
import { fromWei } from './number';

export function apiEstimateModifiedToWEI(estimate) {
	return new BN((estimate * 100000000).toString(), 10);
}

export function getRenderableEthFee(estimate, gasLimit = 21000) {
	const apiEstimate = apiEstimateModifiedToWEI(estimate);
	const gasFee = apiEstimate * gasLimit;
	const eth = fromWei(gasFee);
	return eth;
}

export function getRenderableGweiFiat(estimate, conversionRate, currencyCode) {
	const eth = getRenderableEthFee(estimate);
	const value = parseFloat(Math.round(eth * conversionRate * 100) / 100).toFixed(2);
	return value + currencyCode;
}
