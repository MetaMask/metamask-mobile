import { useCallback, useEffect, useState } from 'react';
import { getBasicGasEstimates } from '../../../../util/custom-gas';
import Logger from '../../../../util/Logger';

function useGasPrice() {
	const [gasPrice, setGasPrice] = useState(null);

	const getGasPrice = useCallback(async () => {
		try {
			const gasEstimates = await getBasicGasEstimates();
			setGasPrice(gasEstimates);
		} catch (error) {
			Logger.log('Swaps: Error while trying to get gas estimates', error);
		}
	}, []);

	useEffect(() => {
		getGasPrice();
	}, [getGasPrice]);

	const updateGasPrice = useCallback(() => getGasPrice(), [getGasPrice]);

	return [gasPrice, updateGasPrice];
}

export default useGasPrice;
