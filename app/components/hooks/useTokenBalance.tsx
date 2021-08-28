import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import Engine from '../../core/Engine';
import { BN } from '@metamask/controllers';

/**
 * Hook to handle the balance of ERC20 tokens
 * @param {String} tokenAddress Token contract address
 * @param {String} userAddress Public address which holds the token
 * @returns {Handlers} Handlers `[balance, loading, error]`
 */

const useTokenBalance = (tokenAddress: string, userAddress: string): [any, boolean, boolean] => {
	// This hook should be only used with ERC20 tokens
	const [balance, setBalance]: [BN | null, Dispatch<SetStateAction<BN | null>>] = useState<BN | null>(null);
	const [loading, setLoading]: [boolean, Dispatch<SetStateAction<boolean>>] = useState<boolean>(true);
	const [error, setError]: [boolean, Dispatch<SetStateAction<boolean>>] = useState<boolean>(false);
	const { TokenBalancesController }: any = Engine.context;

	const fetchBalance = async (tokenAddress: string, userAddress: string): Promise<void> => {
		TokenBalancesController.getBalanceOf(tokenAddress, userAddress)
			.then((balance: BN) => setBalance(balance))
			.catch(() => setError(true))
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		fetchBalance(tokenAddress, userAddress);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tokenAddress, userAddress]);

	return [balance, loading, error];
};

export default useTokenBalance;
