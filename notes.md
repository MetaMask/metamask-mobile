TODOS: UNKNOWN TYPES

1. serializedQrKeyring in restoreQRKeyring function: currently typed as unknown
2. serializedLedgerKeyring in restoreLedgerKeyring function: currently typed as unknown, cast to any for deserialize method
3. KeyringController.importAccountWithStrategy first argument: currently using type assertion to AccountImportStrategy
4. seedPhrase in KeyringController.createNewVaultAndRestore: currently cast to any due to type mismatch
5. KeyringController and its methods: need to investigate the exact types provided by the @metamask/keyring-controller package
