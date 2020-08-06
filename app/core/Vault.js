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
export const recreateVault = async (password = '') => {
	const { KeyringController, PreferencesController } = Engine.context;
	const seedPhrase = await getSeedPhrase(password);
	// Recreate keyring with password given to this method
	await KeyringController.createNewVaultAndRestore(password, seedPhrase);

	// Get props to restore vault
	const hdKeyring = KeyringController.state.keyrings[0];
	const existingAccountCount = hdKeyring.accounts.length;
	const selectedAddress = this.props.selectedAddress;
	let preferencesControllerState = PreferencesController.state;

	// Create previous accounts again
	for (let i = 0; i < existingAccountCount - 1; i++) {
		await KeyringController.addNewAccount();
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
