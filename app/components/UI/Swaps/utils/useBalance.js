import { toChecksumAddress } from '@walletconnect/utils';
import { useMemo } from 'react';
import { renderFromTokenMinimalUnit, renderFromWei } from '../../../../util/number';

function useBalance(accounts, balances, selectedAddress, sourceToken) {
	const balance = useMemo(() => {
		if (!sourceToken) {
			return null;
		}
		if (sourceToken.symbol === 'ETH') {
			return renderFromWei(accounts[selectedAddress] && accounts[selectedAddress].balance);
		}
		const tokenAddress = toChecksumAddress(sourceToken.address);
		return tokenAddress in balances ? renderFromTokenMinimalUnit(balances[tokenAddress], sourceToken.decimals) : 0;
	}, [accounts, balances, selectedAddress, sourceToken]);

	return balance;
}

export default useBalance;
