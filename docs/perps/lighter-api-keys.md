# Lighter trading keys

Your Ethereum address owns your Lighter account. Orders use a separate trading key registered with Lighter in a numbered API-key slot. Core's `LighterProvider` picks the slot, recovers or reuses keys and registers them; see Core [venues/lighter/api-keys.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/venues/lighter/api-keys.md). Mobile creates and stores the keys, reports which slots it can recover, and wires the env.

## Signer bridge

`lighterSignerBridge` is the `LighterSignerBridge` Mobile hands to the controller in `providerCredentials.lighter.signerBridge`. Core never receives a private key.

- Signing runs in the Go/WASM signer inside `LighterSignerWebView`, a hidden WebView mounted in `Root`. Calls queue until the WebView reports ready.
- Every call needs an unlocked wallet. A locked wallet fails with `Lighter signer wallet is locked`.
- `createClient` asks the WebView to load, and each call times out after `LIGHTER_SIGNER_TIMEOUT_MS` (90 s).
- `createClient` checks the registration plaintext the signer returns with `assertLighterRegistrationMessage` before handing it to Core for the wallet signature. It must be exactly Lighter's registration message for this public key, nonce, account index and slot.

Code: `app/components/UI/Perps/Lighter/lighterSignerBridge.ts` `lighterSignerBridge`, `LIGHTER_SIGNER_TIMEOUT_MS`, `LIGHTER_SIGNER_LOCKED_ERROR`; `app/components/UI/Perps/Lighter/LighterSignerWebView.tsx`; `app/components/Views/Root/index.tsx`; `app/components/UI/Perps/Lighter/lighterRegistration.ts` `assertLighterRegistrationMessage`.

## Key creation and storage

`getOrCreatePrivateKey` resolves the key for one network, Lighter account index and slot, in this order:

1. A key already in the native Keychain for that slot. Stored keys take precedence over derivation.
2. For seed-phrase (`hd`) and imported-private-key (`simple`) accounts, a key derived with the keyring's app-key derivation, `exportAccount(address, { withAppKeyOrigin })`, with origin `metamask-internal://perps/lighter/trading-key/v1/<chainId>/<accountIndex>`. It is scoped to the Ethereum account, Lighter network and account index. It does not depend on the slot, the nonce or a `personal_sign` signature. It is not written to the Keychain.
3. For any other keyring (hardware, Snap), a random 32-byte key written to the Keychain.

- Keychain items use service `com.metamask.PERPS_LIGHTER_SIGNER.<chainId>.<accountIndex>.<apiKeyIndex>` and `WHEN_UNLOCKED_THIS_DEVICE_ONLY`.
- Restoring the same software account recreates the derived key, so it can reuse a matching registration without a Keychain entry.
- Keys created on hardware or Snap accounts, and legacy device-generated keys, exist only in the Keychain. They cannot be recreated from the wallet if that storage is lost.
- If a stored item cannot be decrypted and the account cannot derive, the call fails rather than replace a key that may still be registered.

Code: `app/components/UI/Perps/Lighter/lighterSignerBridge.ts` `getOrCreatePrivateKey`, `signerKeyScope`, `LIGHTER_SIGNER_KEY_PREFIX`; `app/components/UI/Perps/Lighter/lighterWalletKey.ts` `deriveLighterWalletKey`.

## Recovery hooks

Core asks the bridge which slots it can recover before it picks one.

| Hook                       | Returns                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `getStoredKeyIndices`      | Slots that have a readable Keychain key                                                                                                        |
| `getRecoverableKeyIndices` | For software accounts, stored slots plus every requested slot, since the derived key works in any slot. For other accounts, stored slots only. |

How Core uses the answer is in Core [venues/lighter/api-keys.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/venues/lighter/api-keys.md#slot-selection).

Code: `app/components/UI/Perps/Lighter/lighterSignerBridge.ts` `getRecoverableKeyIndices`, `getStoredKeyIndices`.

## Developer configuration

```sh
export MM_PERPS_LIGHTER_PROVIDER_ENABLED="true"
# Optional preferred slot. Empty uses the controller default, 7.
export MM_PERPS_LIGHTER_API_KEY_INDEX=""
# Optional testnet account index. Empty discovers it from the selected address.
export MM_PERPS_LIGHTER_ACCOUNT_INDEX_TESTNET=""
```

| Variable                                 | Effect                                                                                                                                                                                                                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MM_PERPS_LIGHTER_PROVIDER_ENABLED`      | `true` mounts the signer WebView; otherwise the signer is left out of the bundle. Also passes `lighter.enabled` and the signer bridge to the controller. The provider is selectable only when the `perpsLighterProviderEnabled` selector is also true; a valid remote flag decides it. |
| `MM_PERPS_LIGHTER_API_KEY_INDEX`         | Preferred slot. Mobile accepts an integer from 0 to 254 and fails configuration on anything else. Core drops a slot below 2 from its candidates.                                                                                                                                       |
| `MM_PERPS_LIGHTER_ACCOUNT_INDEX_TESTNET` | Testnet account override, an integer from 0 to `Number.MAX_SAFE_INTEGER`. Core refuses an account that is not a Standard account owned by the selected address.                                                                                                                        |
| `MM_PERPS_LIGHTER_CHASE_TESTNET_PROBE`   | `true` enables the bounded testnet Chase probe. Pro mode and the Chase flag are still required.                                                                                                                                                                                        |

- The account and slot variables are read only when `MM_PERPS_LIGHTER_PROVIDER_ENABLED` is `true`.
- Put these in `.js.env`. Local builds source it after `builds.yml`, so it overrides values exported in your shell.
- Babel inlines them into whatever bundle you build. Nightly exp builds set `MM_PERPS_LIGHTER_PROVIDER_ENABLED: 'true'` in `builds.yml`.
- Restart Metro with a cleared cache after changing them.
- Changing the preferred slot is not the recovery procedure.

Code: `app/components/UI/Perps/adapters/mobileInfrastructure.ts` `createMobileClientConfig`, `parseLighterIndex`; `app/components/UI/Perps/utils/lighterFeatureFlags.ts` `isLighterProviderEnabled`; `app/components/UI/Perps/selectors/featureFlags/index.ts` `selectPerpsLighterProviderEnabledFlag`; `app/components/UI/Perps/hooks/usePerpsProvider.ts`; `app/components/Views/Root/index.tsx`; `.js.env.example`; `scripts/build.sh`; `babel.config.js`; `builds.yml`.
