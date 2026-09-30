# Gacha / CollectorCrypt integration tests

Shape A exercises the Engine messenger factory, GachaController, its real CollectorCryptProvider, both HTTP clients, response validation and the Solana Snap adapter. Only HTTP fetch, Snap execution and error logging I/O are mocked. Transactions are opaque fixtures, matching the POC's trust in CollectorCrypt.

`buildCollectorCryptIntegrationHarness({ respond?, state? })` returns the Gacha controller, root messenger, isolated HTTP and Snap mocks, and API URL. The controller creates its provider internally; the harness injects real API clients with mocked HTTP. HTTP overrides can return `undefined` to use the default provider response. Passing serialized `GachaControllerState` restores the nested `collectorCrypt` operations and cards. Disk persistence and actual Snap cryptography are outside this boundary.

Tests live beside the feature controller in `app/components/UI/Gacha/controllers/GachaController.integration.test.ts`. They exercise the public Gacha actions and verify provider state through `controller.state.collectorCrypt`, including restarts and wallet resets during HTTP or signing. UI layout and navigation remain separate. See [use cases](collector-crypt-use-cases.md).
