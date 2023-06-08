#  SnapPermissions

The SnapPermissions component is used to display permissions granted to a certain Snap. All permissions will be rendered as a list with each permission displayed as a Card with a title and the installation date of the Snap.

##  Props


The SnapPermissions component expects one prop:

1.  `permissions:  RequestedPermissions`: An object of type [RequestedPermissions](https://github.com/MetaMask/core/blob/43dfaf348c1af150a9e2b688ac23c2ab7c318fee/packages/permission-controller/src/Permission.ts#L199). This object contains the permission names as keys and [RequestedPermission](https://github.com/MetaMask/core/blob/43dfaf348c1af150a9e2b688ac23c2ab7c318fee/packages/permission-controller/src/Permission.ts#L194) as the value. The component will parse this object to render the correct titles.
  
##  Functionality
This component derives human-readable titles for the provided permissions list and maps them to their corresponding cards. The snap methods/permissions and their human-readable counterparts can be found in [this document](https://www.notion.so/bac3299d2c5241c599d2e5e7986e72f7?v=ef742a61bd844435b7171bd2e90b447e).

###  Protocol Derivation
There are a few snap permissions that are protocol specific. Each of these protocols are displayed as a separate permission in the list and contain the human-readable protocol name in the title.

####  These permissions are:

-  `snap_getBip44Entropy`

-  `snap_getBip32Entropy'`

-  `snap_getBip32PublicKey`

  

####  SLIP-0044

The `Bip44` permission follows the [slip-0044](https://github.com/satoshilabs/slips/blob/master/slip-0044.md#registered-coin-types) standard and maps `coin type` as a number to human-readable symbols and names. These mapping can be found [here](https://github.com/satoshilabs/slips/blob/master/slip-0044.md#registered-coin-types). MetaMask uses the [@metamask/slip44](https://github.com/MetaMask/slip44) utility library to maintain these mappings.

#####  Example

The permission...

```JSON
{
  "snap_getBip44Entropy": {
    "id": "TDDl8FTScrkgzs-sQ4ep0",
    "parentCapability": "snap_getBip44Entropy",
    "invoker": "npm:@chainsafe/filsnap",
    "caveats": [
      {
        "type": "permittedCoinTypes",
        "value": [
          {
            "coinType": 1
          },
          {
            "coinType": 2
          }
        ]
      }
    ],
    "date": 1686015956781
  }
}
```

renders the titles `Control your Bitcoin accounts and assets` and `Control your Litecoin accounts and assets` respectively.

  

####  BIP 32

The `snap_getBip32Entropy` and `snap_getBip32PublicKey` rely on a different mapping to derive their protocols. For these permissions, we compare their `path` and `curve` to the [SNAPS_DERIVATION_PATHS](https://github.com/MetaMask/metamask-extension/blob/49f8052b157374370ac71373708933c6e639944e/shared/constants/snaps.ts#L52). The mobile app uses a copy of this object that can be found in `app/constants/snaps.ts`.

#####  Example

The permission...

```json

{
  "snap_getBip32Entropy": {
    "id": "j8TJuxqEtJZbIqjd2bqsq",
    "parentCapability": "snap_getBip32Entropy",
    "invoker": "npm:@metamask/test-snap-bip32",
    "caveats": [
      {
        "type": "permittedDerivationPaths",
        "value": [
          {
            "path": [
              "m",
              "44'",
              "0'"
            ],
            "curve": "secp256k1"
          },
          {
            "path": [
              "m",
              "44'",
              "0'"
            ],
            "curve": "ed25519"
          }
        ]
      }
    ],
    "date": 1686083278257
  }
}
```

renders the titles `Control your Bitcoin Legacy accounts and assets` and `Control your Test BIP-32 Path (ed25519) accounts and assets` respectively.

  

  

##  Usage

  

The `SnapPermissions` component can be used as a regular React component in JSX:

```jsx
const  mockPermissions:  RequestedPermissions  = {
	snap_manageState: {},
	'endowment:rpc': {
		caveats: [
			{
				type:  'rpcOrigin',
				value: {
					dapps:  true,
					snaps:  true,
				},
			},
		],
	},
};

<SnapPermissions  permissions={mockPermissions}  />

```

  
##  Testing

All of this complex logic is tested in the `SnapPermissions/test/SnapPermission.test.tsx` file and can be run with the command `yarn jest SnapPermissions/test/SnapPermission.test.tsx` from the root of the mobile directory.