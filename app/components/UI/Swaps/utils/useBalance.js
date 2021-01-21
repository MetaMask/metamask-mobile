import { toChecksumAddress } from '@walletconnect/utils';
import { useMemo } from 'react';
import { renderFromTokenMinimalUnit, renderFromWei } from '../../../../util/number';

function useBalance(accounts, balances, selectedAddress, sourceToken, { asUnits = false } = {}) {
	const balance = useMemo(() => {
		if (!sourceToken) {
			return null;
		}
		if (sourceToken.symbol === 'ETH') {
			if (asUnits) {
				return (accounts[selectedAddress] && accounts[selectedAddress].balance) || 0;
			}
			return renderFromWei(accounts[selectedAddress] && accounts[selectedAddress].balance);
		}
		const tokenAddress = toChecksumAddress(sourceToken.address);

		if (tokenAddress in balances) {
			if (asUnits) {
				return balances[tokenAddress];
			}
			return renderFromTokenMinimalUnit(balances[tokenAddress], sourceToken.decimals);
		}
		return 0;
	}, [accounts, asUnits, balances, selectedAddress, sourceToken]);

	return balance;
}

export default useBalance;
