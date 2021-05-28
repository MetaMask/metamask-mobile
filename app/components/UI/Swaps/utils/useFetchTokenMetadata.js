import { useEffect, useState } from 'react';
import axios from 'axios';

const defaultTokenMetadata = {
	valid: null,
	error: false,
	metadata: null
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
				// const { data } = await axios.get('URL HERE', { cancelToken: cancelTokenSource.token() });
				const data = await new Promise((resolve, reject) => {
					setTimeout(() => {
						resolve({
							address: '0x6b175474e89094c44da98b954eedeac495271d0f',
							name: 'test token',
							symbol: 'TSTTKN',
							decimals: 9
						});
						// reject('bummer, network error :(');
					}, 700);
				});
				setIsLoading(false);
				// if (isAToken) { // API data should let me know if it is a token or not
				setTokenMetadata({ error: false, valid: true, metadata: data }); // is a token
				// } else {
				// setTokenMetadata({ error: false, valid: false, metadata: null }); // is an address
				// }
			} catch (error) {
				setTokenMetadata({ ...defaultTokenMetadata, error: true });
				setIsLoading(false);
			}
		}
		fetchTokenMetadata();

		return () => {
			cancelTokenSource?.cancel();
			setIsLoading(false);
			setTokenMetadata(defaultTokenMetadata);
		};
	}, [address]);

	return [isLoading, tokenMetadata];
}

export default useFetchTokenMetadata;
