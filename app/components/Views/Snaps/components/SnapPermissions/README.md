#  SnapPermissions

The SnapPermissions component is used to display permissions granted to a certain Snap. All permissions will be rendered as a list with each permission displayed as a Card with a title and the installation date of the Snap.

  

##  Props

The SnapPermissions component expects two props:

 1. `permissions`: An object of permissions granted to the Snap. The
    object is expected to conform to the [SnapPermissions from @metamask/snaps-utils](https://github.com/MetaMask/snaps/blob/ef885f4cf80a19ecc5b5e523f12e4c4c248cc766/packages/snaps-utils/src/manifest/validation.ts#L160).
2. `installedAt`: A number representing the Unix timestamp when the Snap was installed.

  

## Functionality
This component derives human-readable titles for the provided permissions list and maps them to their corresponding cards. The snap methods/permissions and their human-readable counterparts can be found in [this document](https://www.notion.so/bac3299d2c5241c599d2e5e7986e72f7?v=ef742a61bd844435b7171bd2e90b447e).

### Protocol Derivation
There are a few snap permissions that are protocol specific. Each of these protocols are displayed as a separate permission in the list and contain the human-readable protocol name in the title.

#### These permissions are:
- `snap_getBip44Entropy`
- `snap_getBip32Entropy'`
- `snap_getBip32PublicKey`

#### SLIP-0044
The `Bip44` permission follows the [slip-0044](https://github.com/satoshilabs/slips/blob/master/slip-0044.md#registered-coin-types) standard and maps `coin type` as a number to human-readable symbols and names. These mapping can be found [here](https://github.com/satoshilabs/slips/blob/master/slip-0044.md#registered-coin-types). MetaMask uses the [@metamask/slip44](https://github.com/MetaMask/slip44) utility library to maintain these mappings.
##### Example
The permission...
```JSON
{
	snap_getBip44Entropy: [
		{ coinType:  0 },
		{ coinType:  2 },
	]
}
```
renders the titles `Control your Bitcoin accounts and assets` and `Control your Litecoin accounts and assets` respectively. 

#### BIP 32
The `snap_getBip32Entropy` and `snap_getBip32PublicKey` rely on a different mapping to derive their protocols.  For these permissions, we compare their `path` and `curve` to the [SNAPS_DERIVATION_PATHS](https://github.com/MetaMask/metamask-extension/blob/49f8052b157374370ac71373708933c6e639944e/shared/constants/snaps.ts#L52). The mobile app uses a copy of this object that can be found in `app/constants/snaps.ts`.
##### Example
The permission...
```json
{
	snap_getBip32Entropy: [
		{
			path: ['m',  `44'`,  `0'`],
			curve:  'ed25519',
		},
		{
			path: ['m',  `44'`,  `1'`],
			curve:  'secp256k1',
		},
	]
}
```
renders the titles `Control your Test BIP-32 Path (ed25519) accounts and assets` and `Control your Test BIP-32 Path (secp256k1) accounts and assets` respectively.

## Usage

The `SnapPermissions` component can be used as a regular React component in JSX:
```jsx
<SnapPermissions  permissions={permissions}  installedAt={installedAt} />
```
Where permissions is an object of the `SnapPermissions` type and installedAt is a Unix timestamp representing the installation time of the Snap.

## Testing
All of this complex logic is tested in the `SnapPermissions/test/SnapPermission.test.tsx` file and can be run with the command `yarn jest SnapPermissions/test/SnapPermission.test.tsx` from the root of the mobile directory.