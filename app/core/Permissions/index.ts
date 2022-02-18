import { errorCodes as rpcErrorCodes } from 'eth-rpc-errors';
import { RestrictedMethods, CaveatTypes } from './constants';
import ImportedEngine from '../Engine';
const Engine = ImportedEngine as any;

function getAccountsCaveatFromPermission(accountsPermission: any = {}) {
	return (
		Array.isArray(accountsPermission.caveats) &&
		accountsPermission.caveats.find((caveat: any) => caveat.type === CaveatTypes.restrictReturnedAccounts)
	);
}

function getAccountsPermissionFromSubject(subject: any = {}) {
	return subject.permissions?.eth_accounts || {};
}

function getAccountsFromPermission(accountsPermission: any) {
	const accountsCaveat = getAccountsCaveatFromPermission(accountsPermission);
	return accountsCaveat && Array.isArray(accountsCaveat.value) ? accountsCaveat.value : [];
}

function getAccountsFromSubject(subject: any) {
	return getAccountsFromPermission(getAccountsPermissionFromSubject(subject));
}

export const getPermittedAccountsByOrigin = (state: any) => {
	const subjects = state.subjects;
	return Object.keys(subjects).reduce((acc: any, subjectKey) => {
		const accounts = getAccountsFromSubject(subjects[subjectKey]);
		if (accounts.length > 0) {
			acc[subjectKey] = accounts;
		}
		return acc;
	}, {});
};

export const addPermittedAccount = (origin: string, account: string) => {
	const { PermissionController } = Engine.context;
	const existing = PermissionController.getCaveat(
		origin,
		RestrictedMethods.eth_accounts,
		CaveatTypes.restrictReturnedAccounts
	);

	if (existing.value.includes(account)) {
		throw new Error(`eth_accounts permission for origin "${origin}" already permits account "${account}".`);
	}

	PermissionController.updateCaveat(origin, RestrictedMethods.eth_accounts, CaveatTypes.restrictReturnedAccounts, [
		...existing.value,
		account,
	]);
};

export const removePermittedAccount = (origin: string, account: string) => {
	const { PermissionController } = Engine.context;

	const existing = PermissionController.getCaveat(
		origin,
		RestrictedMethods.eth_accounts,
		CaveatTypes.restrictReturnedAccounts
	);

	if (!existing.value.includes(account)) {
		throw new Error(`eth_accounts permission for origin "${origin}" already does not permit account "${account}".`);
	}

	const remainingAccounts = existing.value.filter((existingAccount: string) => existingAccount !== account);

	if (remainingAccounts.length === 0) {
		PermissionController.revokePermission(origin, RestrictedMethods.eth_accounts);
	} else {
		PermissionController.updateCaveat(
			origin,
			RestrictedMethods.eth_accounts,
			CaveatTypes.restrictReturnedAccounts,
			remainingAccounts
		);
	}
};

export const getPermittedAccounts = async (origin: string) => {
	try {
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
