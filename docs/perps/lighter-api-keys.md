# Lighter API Keys (Trading Key Slots)

## What a slot is

Lighter orders are not signed by the wallet. Your Lighter account belongs to your wallet address, and orders are signed by a trading key, which Lighter calls an API key. An account holds several of these keys, each in a numbered slot.

Mobile generates its key in the embedded Lighter signer and keeps the private half on the device. The wallet signs one `personal_sign` message to register the key in the slot, when trading is prepared or before the first order. After that, orders are signed with the key and need no wallet prompt. It is the same idea as a HyperLiquid agent key.

## Local setup

```sh
export MM_PERPS_LIGHTER_PROVIDER_ENABLED="true"
# A free slot for this device or simulator (0..254). Empty uses the controller default (7).
export MM_PERPS_LIGHTER_API_KEY_INDEX="9"
# Optional. Empty finds the account from the wallet address.
export MM_PERPS_LIGHTER_ACCOUNT_INDEX_TESTNET=""
```

These values are built into the bundle: restart Metro with a cleared cache after changing them.

## One slot per device

A key only works on the device that generated it. Every simulator, device and script (for example the core Lighter e2e) trading on the same account needs its own slot.

Find your account index from your address, then check that a slot is free (`"api key not found"`):

```sh
curl -s "https://testnet.zklighter.elliot.ai/api/v1/accountsByL1Address?l1_address=<address>"
curl -s "https://testnet.zklighter.elliot.ai/api/v1/apikeys?account_index=<account>&api_key_index=<slot>"
```

## "Lighter API key slot N already contains a different key"

The slot holds a key this device did not create, for example one registered by another simulator or script. The app does not replace it, since that key may still be in use. Set `MM_PERPS_LIGHTER_API_KEY_INDEX` to a free slot and restart Metro with a cleared cache.

## After a testnet reset

Account indexes can change. Leave `MM_PERPS_LIGHTER_ACCOUNT_INDEX_TESTNET` empty so the app finds the account from the wallet address, or update it to the new index.
