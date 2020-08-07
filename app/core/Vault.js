import Engine from './Engine';

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
 * Recreates a vault
 *
 * @param password - Password to recreate and set the vault with
 */
export const recreateVault = async (password = '', selectedAddress) => {
	const { KeyringController, PreferencesController } = Engine.context;
	const seedPhrase = await getSeedPhrase(password);
	const importedAccounts = [];

	// Get imported accounts
	if (KeyringController.state.keyrings.length === 2) {
		const simpleKeyring = KeyringController.state.keyrings[1];
		for (let i = 0; i < simpleKeyring.accounts.length; i++) {
			const privateKey = await KeyringController.exportAccount(password, simpleKeyring.accounts[i]);
			importedAccounts.push(privateKey);
		}
	}
	// Recreate keyring with password given to this method
	await KeyringController.createNewVaultAndRestore(password, seedPhrase);

	// Get props to restore vault
	const hdKeyring = KeyringController.state.keyrings[0];
	const existingAccountCount = hdKeyring.accounts.length;
	let preferencesControllerState = PreferencesController.state;

	// Create previous accounts again
	for (let i = 0; i < existingAccountCount - 1; i++) {
		await KeyringController.addNewAccount();
	}

	// Import imported accounts again
	for (let i = 0; i < importedAccounts.length; i++) {
		await KeyringController.importAccountWithStrategy('privateKey', [importedAccounts[i]]);
	}

	// Reset preferencesControllerState
	preferencesControllerState = PreferencesController.state;

	// Set preferencesControllerState again
	await PreferencesController.update(preferencesControllerState);
	// Reselect previous selected account if still available
	if (hdKeyring.accounts.includes(selectedAddress)) {
		PreferencesController.setSelectedAddress(selectedAddress);
	} else {
		PreferencesController.setSelectedAddress(hdKeyring[0]);
	}
};
