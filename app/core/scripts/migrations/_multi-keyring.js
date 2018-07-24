const version = 5;

/*

This is an incomplete migration bc it requires post-decrypted data
which we dont have access to at the time of this writing.

*/

const ObservableStore = require('obs-store');
const ConfigManager = require('../../app/scripts/lib/config-manager');
const IdentityStoreMigrator = require('../../app/scripts/lib/idStore-migrator');
const KeyringController = require('eth-keyring-controller');

const password = 'obviously not correct';

module.exports = {
	version,

	migrate: function(versionedData) {
		versionedData.meta.version = version;

		const store = new ObservableStore(versionedData.data);
		const configManager = new ConfigManager({ store });
		const idStoreMigrator = new IdentityStoreMigrator({ configManager });
		const keyringController = new KeyringController({
			configManager: configManager
		});

		// attempt to migrate to multiVault
		return idStoreMigrator.migratedVaultForPassword(password).then(result => {
			// skip if nothing to migrate
			if (!result) return Promise.resolve(versionedData);
			delete versionedData.data.wallet;
			// create new keyrings
			const privKeys = result.lostAccounts.map(acct => acct.privateKey);
			return Promise.all([
				keyringController.restoreKeyring(result.serialized),
				keyringController.restoreKeyring({ type: 'Simple Key Pair', data: privKeys })
			])
				.then(() => {
					return keyringController.persistAllKeyrings(password);
				})
				.then(() => {
					// copy result on to state object
					versionedData.data = store.get();
					return Promise.resolve(versionedData);
				});
		});
	}
};
