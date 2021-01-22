import { swapsUtils } from '@estebanmino/controllers';
import { toChecksumAddress } from '@walletconnect/utils';
import { useMemo } from 'react';
import numberToBN from 'number-to-bn';
import { renderFromTokenMinimalUnit, renderFromWei } from '../../../../util/number';

function useBalance(accounts, balances, selectedAddress, sourceToken, { asUnits = false } = {}) {
	const balance = useMemo(() => {
		if (!sourceToken) {
			return null;
		}
		if (sourceToken.address === swapsUtils.ETH_SWAPS_TOKEN_ADDRESS) {
			if (asUnits) {
				// Controller stores balances in hex for ETH
				return numberToBN((accounts[selectedAddress] && accounts[selectedAddress].balance) || 0);
			}
			return renderFromWei(accounts[selectedAddress] && accounts[selectedAddress].balance);
		}
		const tokenAddress = toChecksumAddress(sourceToken.address);

		if (tokenAddress in balances) {
			if (asUnits) {
				return numberToBN(balances[tokenAddress]);
			}
			return renderFromTokenMinimalUnit(balances[tokenAddress], sourceToken.decimals);
		}
		return numberToBN(0);
	}, [accounts, asUnits, balances, selectedAddress, sourceToken]);

	return balance;
}

export default useBalance;
