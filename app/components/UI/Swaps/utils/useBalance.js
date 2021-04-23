import { useMemo } from 'react';
import numberToBN from 'number-to-bn';
import { isSwapsNativeAsset } from '.';
import { renderFromTokenMinimalUnit, renderFromWei } from '../../../../util/number';
import { safeToChecksumAddress } from '../../../../util/address';

function useBalance(accounts, balances, selectedAddress, sourceToken, { asUnits = false } = {}) {
	const balance = useMemo(() => {
		if (!sourceToken) {
			return null;
		}
		if (isSwapsNativeAsset(sourceToken)) {
			if (asUnits) {
				// Controller stores balances in hex for ETH
				return numberToBN((accounts[selectedAddress] && accounts[selectedAddress].balance) || 0);
			}
			return renderFromWei(accounts[selectedAddress] && accounts[selectedAddress].balance);
		}
		const tokenAddress = safeToChecksumAddress(sourceToken.address);

		if (tokenAddress in balances) {
			if (asUnits) {
				return balances[tokenAddress];
			}
			return renderFromTokenMinimalUnit(balances[tokenAddress], sourceToken.decimals);
		}
		return numberToBN(0);
	}, [accounts, asUnits, balances, selectedAddress, sourceToken]);

	return balance;
}

export default useBalance;
