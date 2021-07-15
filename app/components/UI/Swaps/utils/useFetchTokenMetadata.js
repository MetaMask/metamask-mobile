import { useEffect, useState } from 'react';
import axios from 'axios';

const defaultTokenMetadata = {
	valid: null,
	error: false,
	metadata: null
};

// TODO: change this with a multi chain endpoint in the future
const SWAPS_TOKEN_API = {
	'1': 'https://api.metaswap.codefi.network',
	'1337': 'https://metaswap-api.airswap-dev.codefi.network',
	'56': 'https://bsc-api.metaswap.codefi.network'
};

function useFetchTokenMetadata(address, chainId) {
	const [isLoading, setIsLoading] = useState(false);
	const [tokenMetadata, setTokenMetadata] = useState(defaultTokenMetadata);

	useEffect(() => {
		if (!address) {
			return;
		}

		let cancelTokenSource;
		async function fetchTokenMetadata() {
			try {
				cancelTokenSource = axios.CancelToken.source();
				setTokenMetadata(defaultTokenMetadata);
				setIsLoading(true);
				const { data } = await axios.request({
					url: '/token',
					baseURL: SWAPS_TOKEN_API[chainId],
					params: {
						address
					},
					cancelToken: cancelTokenSource.token
				});
				setTokenMetadata({ error: false, valid: true, metadata: data });
			} catch (error) {
				// Address is not an ERC20
				if (error?.response?.status === 422) {
					setTokenMetadata({ error: false, valid: false, metadata: null });
				} else {
					setTokenMetadata({ ...defaultTokenMetadata, error: true });
				}
			} finally {
				setIsLoading(false);
			}
		}
		fetchTokenMetadata();

		return () => {
			cancelTokenSource?.cancel();
			setIsLoading(false);
			setTokenMetadata(defaultTokenMetadata);
		};
	}, [address, chainId]);

	return [isLoading, tokenMetadata];
}

export default useFetchTokenMetadata;
