import { CaveatTypes } from './constants';

function getAccountsCaveatFromPermission(accountsPermission = {}) {
	return (
		Array.isArray(accountsPermission.caveats) &&
		accountsPermission.caveats.find((caveat) => caveat.type === CaveatTypes.restrictReturnedAccounts)
	);
}

function getAccountsPermissionFromSubject(subject = {}) {
	return subject.permissions?.eth_accounts || {};
}

function getAccountsFromPermission(accountsPermission) {
	const accountsCaveat = getAccountsCaveatFromPermission(accountsPermission);
	return accountsCaveat && Array.isArray(accountsCaveat.value) ? accountsCaveat.value : [];
}

function getAccountsFromSubject(subject) {
	return getAccountsFromPermission(getAccountsPermissionFromSubject(subject));
}

export const getPermittedAccountsByOrigin = (state) => {
	const subjects = state.subjects;
	return Object.keys(subjects).reduce((acc, subjectKey) => {
		const accounts = getAccountsFromSubject(subjects[subjectKey]);
		if (accounts.length > 0) {
			acc[subjectKey] = accounts;
		}
		return acc;
	}, {});
};

export default getPermittedAccountsByOrigin;
