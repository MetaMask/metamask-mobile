# Lighter trading keys

Your Ethereum address owns your Lighter account. Orders use a separate trading key registered with Lighter in a numbered API-key slot. Mobile selects and manages these slots automatically; users should not need to choose one to trade.

## Recovery and reuse

For new trading keys on seed-phrase and imported-private-key accounts, Mobile uses the software keyring's [app-key derivation](../../app/components/UI/Perps/Lighter/lighterWalletKey.ts). The key is scoped to the Ethereum account, Lighter network and Lighter account index. It does not depend on the slot, nonce or a `personal_sign` signature.

Mobile compares recoverable keys with Lighter's registered public keys before signing orders. Restoring the same software account can reuse a matching registration made with this derived key, even without a saved native Keychain entry. Reconnect reuses a matching key instead of allocating another slot.

Existing locally stored trading keys are also supported and take precedence over derivation. Legacy device-generated keys and keys used by hardware or Snap keyrings depend on local storage. They cannot be recreated from the Ethereum wallet if that storage is lost.

When a new registration is needed, the Ethereum wallet signs its registration message. Mobile waits for the registered key to become visible before using it. A pending or uncertain registration remains tied to its original slot and is checked on reconnect.

Mobile does not replace an occupied slot's key merely because it differs from this device's key. Another device or application may still use it. Automatic selection is bounded to trading slots 2 through 254.

## Developer configuration

```sh
export MM_PERPS_LIGHTER_PROVIDER_ENABLED="true"
# Optional preferred slot, 2..254. Empty uses the controller default, 7.
# Automatic recovery may reuse a matching key registered in another slot.
export MM_PERPS_LIGHTER_API_KEY_INDEX=""
# Optional testnet account index. Empty discovers it from the selected address.
export MM_PERPS_LIGHTER_ACCOUNT_INDEX_TESTNET=""
```

Add these exports to `.js.env`; the build scripts reload that file and can overwrite values exported in your shell. These values are built into the development bundle. Restart Metro with a cleared cache after changing them. Changing the preferred slot is not the normal recovery procedure.

## If trading setup fails

Confirm the selected Ethereum account and Lighter network, then reconnect or use Orders Retry after a temporary connection failure. Balances are public account data; seeing a balance does not prove that a matching trading key has authenticated.

If Mobile reports that the key cannot be recovered, use a device that still has its registered key. Do not repeatedly change slots or remove another device's registration. If all trading slots are occupied, identify an unused key in Lighter before removing it.

After a testnet reset, account indexes can change. Leave the testnet account-index override empty so discovery follows the selected Ethereum address, or update it to the current index.
