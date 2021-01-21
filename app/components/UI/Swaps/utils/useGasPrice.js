import { useCallback, useEffect, useState } from 'react';
import { fetchBasicGasEstimates } from '../../../../util/custom-gas';
import Logger from '../../../../util/Logger';

function useGasPrice() {
	const [price, setPrice] = useState(null);

	const getPrices = useCallback(async () => {
		try {
			const basicGasEstimates = await fetchBasicGasEstimates();
			setPrice(basicGasEstimates);
		} catch (error) {
			Logger.log('Swaps: Error while trying to get gas estimates', error);
		}
	}, []);

	useEffect(() => {
		getPrices();
	}, [getPrices]);

	const updatePrice = useCallback(() => getPrices(), [getPrices]);

	return [price, updatePrice];
}

export default useGasPrice;
