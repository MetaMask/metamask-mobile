import Engine from './Engine';
import Logger from '../util/Logger';

/**
 * Returns current vault seed phrase
 * It does it using an empty password or a password set by the user
 * depending on the state the app is currently in
 */
export const getSeedPhrase = async (password = '') => {
	const { KeyringController } = Engine.context;
	const mnemonic = await KeyringController.exportSeedPhrase(password);
	return JSON.stringify(mnemonic).replace(/"/g, '');
};

/**
 * Recreates a vault with the same password for the purpose of using the newest encryption methods
 *
 * @param password - Password to recreate and set the vault with
 */
export const recreateVaultWithSamePassword = async (password = '', selectedAddress) => {
	const { KeyringController, PreferencesController, AccountTrackerController } = Engine.context;
	const seedPhrase = await getSeedPhrase(password);
	const oldIdentities = PreferencesController.state.identities;
	const oldAccounts = AccountTrackerController.accounts;

	let importedAccounts = [];
	try {
		// Get imported accounts
		const simpleKeyrings = KeyringController.state.keyrings.filter(keyring => keyring.type === 'Simple Key Pair');
		for (let i = 0; i < simpleKeyrings.length; i++) {
			const simpleKeyring = simpleKeyrings[i];
			const simpleKeyringAccounts = await Promise.all(
				simpleKeyring.accounts.map(account => KeyringController.exportAccount(password, account))
			);
			importedAccounts = [...importedAccounts, ...simpleKeyringAccounts];
		}
	} catch (e) {
		Logger.error(e, 'error while trying to get imported accounts on recreate vault');
	}

	// Recreate keyring with password given to this method
	await KeyringController.createNewVaultAndRestore(password, seedPhrase);

	// Get props to restore vault
	const hdKeyring = KeyringController.state.keyrings[0];
	const existingAccountCount = hdKeyring.accounts.length;

	// Create previous accounts again
	for (let i = 0; i < existingAccountCount - 1; i++) {
		await KeyringController.addNewAccount();
	}

	try {
		// Import imported accounts again
		for (let i = 0; i < importedAccounts.length; i++) {
			await KeyringController.importAccountWithStrategy('privateKey', [importedAccounts[i]]);
		}
	} catch (e) {
		Logger.error(e, 'error while trying to import accounts on recreate vault');
	}

	//Persist old account/identities names
	const preferencesControllerState = PreferencesController.state;
	if (oldIdentities) {
		for (const id in preferencesControllerState.identities) {
			const oldName = oldIdentities[id].name;
			if (oldName) preferencesControllerState.identities[id].name = oldName;
		}
	}

	//Persist old account data
	const accounts = AccountTrackerController.accounts;
	if (oldAccounts) {
		for (const account in accounts) {
			const oldAccount = oldAccounts[account];
			if (oldAccount) accounts[account] = oldAccount;
		}
	}

	// Set preferencesControllerState again
	await PreferencesController.update(preferencesControllerState);
	await AccountTrackerController.update(accounts);

	// Reselect previous selected account if still available
	if (hdKeyring.accounts.includes(selectedAddress)) {
		PreferencesController.setSelectedAddress(selectedAddress);
	} else {
		PreferencesController.setSelectedAddress(hdKeyring[0]);
	}
};
