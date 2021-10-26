import { util } from '@metamask/controllers';
import Engine from '../Engine';

export const polyfillGasPrice = async (method, params = []) => {
	const { TransactionController } = Engine.context;
	const data = await util.query(TransactionController.ethQuery, method, params);

	if (data && data.maxFeePerGas && !data.gasPrice) {
		data.gasPrice = data.maxFeePerGas;
	}

	return data;
};

export default {
	polyfillGasPrice,
};
