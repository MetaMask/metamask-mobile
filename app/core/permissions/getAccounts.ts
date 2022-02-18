import { errorCodes as rpcErrorCodes } from 'eth-rpc-errors';
import { RestrictedMethods } from '../permissions/constants';
import ImportedEngine from '../Engine';

const getPermittedAccounts = async (origin: string) => {
	try {
		const Engine = ImportedEngine as any;

		return await Engine.context.PermissionController.executeRestrictedMethod(
			origin,
			RestrictedMethods.eth_accounts
		);
	} catch (error: any) {
		if (error.code === rpcErrorCodes.provider.unauthorized) {
			return [];
		}
		throw error;
	}
};

export default getPermittedAccounts;
