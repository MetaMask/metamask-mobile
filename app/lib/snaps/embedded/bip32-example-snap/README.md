# `@metamask/bip32-example-snap`

This snap demonstrates the use of `snap_getBip32Entropy` and
`snap_getBip32PublicKey` to derive a BIP-32 public key and private key from the
user's secret recovery phrase.

## Snap manifest

> **Note**: Using `snap_getBip32Entropy` and `snap_getBip32PublicKey`
> requires their respective `snap_getBip32Entropy` and `snap_getBip32PublicKey`
> permissions. Refer to [the documentation](https://docs.metamask.io/snaps/reference/rpc-api/#snap_getbip32entropy)
> for more information.

Along with other permissions, the manifest of this snap includes the
`snap_getBip32Entropy` and `snap_getBip32PublicKey` permissions:

```json
{
  "initialPermissions": {
    "snap_getBip32Entropy": [
      {
        "path": ["m", "44'", "0'"],
        "curve": "secp256k1"
      },
      {
        "path": ["m", "44'", "0'"],
        "curve": "ed25519"
      }
    ],
    "snap_getBip32PublicKey": [
      {
        "path": ["m", "44'", "0'"],
        "curve": "secp256k1"
      }
    ]
  }
}
```

Each of the items in the `snap_getBip32Entropy` and `snap_getBip32PublicKey`
permissions is an object with the following properties:

- `path`: The BIP-32 derivation path to use.
- `curve`: The elliptic curve to use. These methods support `secp256k1` and
  `ed25519`.

## Snap usage

This snap exposes an `onRpcRequest` handler, which supports the following
JSON-RPC methods:

- `getPublicKey`: Get the public key for the given `path` and
  `curve`.
- `signMessage`: Sign a `message` with the private key for the given `path`
  and `curve`. The message is signed with the chosen curve's signing algorithm
  (ECDSA for `secp256k1` and EdDSA for `ed25519`).

For more information, you can refer to
[the end-to-end tests](./src/index.test.ts).
