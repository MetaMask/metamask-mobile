import React from 'react';
import { render } from '@testing-library/react-native';
import SnapPermissions from '../SnapPermissions';
import {
  SNAP_PERMISSIONS_DATE,
  SNAP_PERMISSIONS_TITLE,
  SNAP_PERMISSION_CELL,
} from '../../../../../../constants/test-ids';
import { SnapPermissions as SnapPermissionsType } from '@metamask/snaps-utils';

describe('SnapPermissions', () => {
  const mockDate = 1684964145490;
  const longRunningTitle = 'Run indefinitely';
  const networkAccessTitle = 'Access the internet';
  const transactionInsightTitle = 'Display transaction insights';
  const cronjobTitle = 'Schedule and run periodic actions';
  const rpcSnapsTitle =
    'Allow other snaps to communicate directly with this snap';
  const rpcDappsTitle = 'Allow dapps to communicate directly with this snap';
  const snapConfirmTitle = 'Display custom dialogs';
  const snapManageStateTitle = 'Store and manage data on your device';
  const snapNotifyTitle = 'Show notifications';
  const snapGetBip32EntropyTitle = (protocol: string) =>
    `Control your ${protocol} accounts and assets`;
  const snapGetBip32PublicKeyTitle = 'View your public key for [protocol]';
  const snapGetBip44EntropyTitle = (protocol: string) =>
    `Control your ${protocol} accounts and assets`;
  const snapGetEntropyTitle = 'Derive arbitrary keys unique to this snap';
  const endowmentKeyringTitle = 'endowment:keyring';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders permissions correctly', () => {
    const mockPermissions: SnapPermissionsType = {
      'endowment:long-running': {},
      'endowment:network-access': {},
      'endowment:transaction-insight': {
        allowTransactionOrigin: true,
      },
      'endowment:cronjob': {
        jobs: [
          {
            expression: '* * * * *',
            request: {
              method: 'GET',
              params: {},
              id: '1',
              jsonrpc: '2.0',
            },
          },
        ],
      },
      'endowment:rpc': {
        dapps: true,
        snaps: true,
      },
      snap_confirm: {},
      snap_manageState: {},
      snap_notify: {},
      snap_getBip32Entropy: [
        {
          path: ['m', "44'", "0'"],
          curve: 'secp256k1',
        },
      ],
      snap_getBip32PublicKey: [
        {
          path: ['m', '44', '0', '0', '0'],
          curve: 'secp256k1',
        },
      ],
      snap_getBip44Entropy: [
        {
          coinType: 1,
        },
      ],
      snap_getEntropy: {},
      'endowment:keyring': {
        namespaces: {
          mockNamespace: {
            chains: [
              {
                name: 'Mock Chain',
                id: 'mock-chain-id',
              },
            ],
            methods: ['mockMethod1', 'mockMethod2'],
            events: ['mockEvent1', 'mockEvent2'],
          },
        },
      },
    };

    const { getAllByTestId } = render(
      <SnapPermissions permissions={mockPermissions} installedAt={mockDate} />,
    );
    const permissionCells = getAllByTestId(SNAP_PERMISSION_CELL);
    const permissionCellTitles = getAllByTestId(SNAP_PERMISSIONS_TITLE);

    expect(permissionCells.length).toBe(14);
    expect(permissionCellTitles[0].props.children).toBe(longRunningTitle);
    expect(permissionCellTitles[1].props.children).toBe(networkAccessTitle);
    expect(permissionCellTitles[2].props.children).toBe(
      transactionInsightTitle,
    );
    expect(permissionCellTitles[3].props.children).toBe(cronjobTitle);
    expect(permissionCellTitles[4].props.children).toBe(rpcDappsTitle);
    expect(permissionCellTitles[5].props.children).toBe(rpcSnapsTitle);
    expect(permissionCellTitles[6].props.children).toBe(snapConfirmTitle);
    expect(permissionCellTitles[7].props.children).toBe(snapManageStateTitle);
    expect(permissionCellTitles[8].props.children).toBe(snapNotifyTitle);
    expect(permissionCellTitles[9].props.children).toBe(
      snapGetBip32EntropyTitle('Bitcoin Legacy'),
    );
    expect(permissionCellTitles[10].props.children).toBe(
      snapGetBip32PublicKeyTitle,
    );
    expect(permissionCellTitles[11].props.children).toBe(
      snapGetBip44EntropyTitle('Bitcoin'),
    );
    expect(permissionCellTitles[12].props.children).toBe(snapGetEntropyTitle);
    expect(permissionCellTitles[13].props.children).toBe(endowmentKeyringTitle);
  });

  it('renders correct installed date', () => {
    const permissions: SnapPermissionsType = {
      'endowment:network-access': {},
      'endowment:rpc': {
        dapps: true,
        snaps: true,
      },
    };
    const { getAllByTestId } = render(
      <SnapPermissions permissions={permissions} installedAt={mockDate} />,
    );
    const permissionCellDates = getAllByTestId(SNAP_PERMISSIONS_DATE);

    const expectedDate = 'Approved on May 24 at 5:35 pm';

    expect(permissionCellDates[0].props.children).toBe(expectedDate);
    expect(permissionCellDates[1].props.children).toBe(expectedDate);
  });

  it('renders correct permissions cells for endowment:rpc when both dapps and snaps are permitted', () => {
    const permissions: SnapPermissionsType = {
      'endowment:rpc': {
        dapps: true,
        snaps: true,
      },
    };
    const { getAllByTestId } = render(
      <SnapPermissions permissions={permissions} installedAt={mockDate} />,
    );
    const permissionCells = getAllByTestId(SNAP_PERMISSIONS_TITLE);

    expect(permissionCells.length).toBe(2);
    expect(permissionCells[0].props.children).toBe(rpcDappsTitle);
    expect(permissionCells[1].props.children).toBe(rpcSnapsTitle);
  });

  it('only renders snap rpc permission when only snaps are permitted', () => {
    const permissions: SnapPermissionsType = {
      'endowment:rpc': {
        dapps: false,
        snaps: true,
      },
    };
    const { getAllByTestId } = render(
      <SnapPermissions permissions={permissions} installedAt={mockDate} />,
    );
    const permissionCells = getAllByTestId(SNAP_PERMISSIONS_TITLE);

    expect(permissionCells.length).toBe(1);
    expect(permissionCells[0].props.children).toBe(rpcSnapsTitle);
  });

  it('only renders dapps rpc permission when only dapps are permitted', () => {
    const permissions: SnapPermissionsType = {
      'endowment:rpc': {
        dapps: true,
        snaps: false,
      },
    };
    const { getAllByTestId } = render(
      <SnapPermissions permissions={permissions} installedAt={mockDate} />,
    );
    const permissionCells = getAllByTestId(SNAP_PERMISSIONS_TITLE);

    expect(permissionCells.length).toBe(1);
    expect(permissionCells[0].props.children).toBe(rpcDappsTitle);
  });

  it('does not render rpc permissions when both snaps and dapps are false', () => {
    const permissions: SnapPermissionsType = {
      'endowment:rpc': {
        dapps: false,
        snaps: false,
      },
    };
    const { queryAllByTestId } = render(
      <SnapPermissions permissions={permissions} installedAt={mockDate} />,
    );
    const permissionCells = queryAllByTestId(SNAP_PERMISSIONS_TITLE);

    expect(permissionCells.length).toBe(0);
  });

  it('renders the correct permissions snap_getBip44Entropy with specified protocols', () => {
    const mockPermissions: SnapPermissionsType = {
      snap_getBip44Entropy: [
        { coinType: 0 }, // Bitcoin
        { coinType: 1 }, // Testnet (all coins)
        { coinType: 2 }, // Litecoin
        { coinType: 3 }, // Dogecoin
        { coinType: 4 }, // Reddcoin
        { coinType: 5 }, // Dash
        { coinType: 6 }, // Peercoin
        { coinType: 7 }, // Namecoin
        { coinType: 8 }, // Feathercoin
        { coinType: 9 }, // Counterparty
        { coinType: 10 }, // 0x8000000a	BLK	Blackcoin
        { coinType: 11 }, //	0x8000000b	NSR	NuShares
        { coinType: 12 }, // 0x8000000c	NBT	NuBits
        { coinType: 13 }, // 0x8000000d	MZC	Mazacoin
        { coinType: 14 }, // 0x8000000e	VIA	Viacoin
        { coinType: 15 }, //	0x8000000f	XCH	ClearingHouse
        { coinType: 16 }, //	0x80000010	RBY	Rubycoin
        { coinType: 17 }, //	0x80000011	GRS	Groestlcoin
        { coinType: 18 }, //	0x80000012	DGC	Digitalcoin
        { coinType: 19 }, // 0x80000013	CCN	Cannacoin
        { coinType: 20 }, //	0x80000014	DGB	DigiByte
        { coinType: 21 }, //	0x80000015		Open Assets
        { coinType: 22 }, //	0x80000016	MONA	Monacoin
        { coinType: 23 }, //	0x80000017	CLAM	Clams
        { coinType: 24 }, //	0x80000018	XPM	Primecoin
        { coinType: 25 }, //	0x80000019	NEOS	Neoscoin
        { coinType: 26 }, //	0x8000001a	JBS	Jumbucks
        { coinType: 27 }, //	0x8000001b	ZRC	ziftrCOIN
        { coinType: 28 }, //	0x8000001c	VTC	Vertcoin
        { coinType: 29 }, //0x8000001d	NXT	NXT
        { coinType: 30 }, //	0x8000001e	BURST	Burst
        { coinType: 31 }, //	0x8000001f	MUE	MonetaryUnit
        { coinType: 32 }, //	0x80000020	ZOOM	Zoom
        { coinType: 33 }, //	0x80000021	VASH	Virtual Cash
        { coinType: 34 }, //	0x80000022	CDN	Canada eCoin
        { coinType: 35 }, //	0x80000023	SDC	ShadowCash
        { coinType: 36 }, //	0x80000024	PKB	ParkByte
        { coinType: 37 }, //	0x80000025	PND	Pandacoin
        { coinType: 38 }, //	0x80000026	START	StartCOIN
        { coinType: 39 }, //	0x80000027	MOIN	MOIN
        { coinType: 40 }, //	0x80000028	EXP	Expanse
        { coinType: 41 }, //	0x80000029	EMC2	Einsteinium
        { coinType: 42 }, //	0x8000002a	DCR	Decred
        { coinType: 43 }, //	0x8000002b	XEM	NEM
        { coinType: 44 }, //	0x8000002c	PART	Particl
        { coinType: 45 }, // 0x8000002d	ARG	Argentum (dead)
        { coinType: 46 }, //	0x8000002e		Libertas
        { coinType: 47 }, //	0x8000002f		Posw coin
        { coinType: 48 }, //	0x80000030	SHR	Shreeji
        { coinType: 49 }, //	0x80000031	GCR	Global Currency Reserve (GCRcoin)
      ],
    };
    const { getAllByTestId } = render(
      <SnapPermissions permissions={mockPermissions} installedAt={mockDate} />,
    );
    const permissionCellTitles = getAllByTestId(SNAP_PERMISSIONS_TITLE);

    expect(permissionCellTitles.length).toBe(50);
    expect(permissionCellTitles[0].props.children).toBe(
      snapGetBip44EntropyTitle('Bitcoin'),
    );
    expect(permissionCellTitles[1].props.children).toBe(
      snapGetBip44EntropyTitle('Test Networks'),
    );
    expect(permissionCellTitles[2].props.children).toBe(
      snapGetBip44EntropyTitle('Litecoin'),
    );
    expect(permissionCellTitles[3].props.children).toBe(
      snapGetBip44EntropyTitle('Dogecoin'),
    );
    expect(permissionCellTitles[4].props.children).toBe(
      snapGetBip44EntropyTitle('Reddcoin'),
    );
    expect(permissionCellTitles[5].props.children).toBe(
      snapGetBip44EntropyTitle('Dash'),
    );
    expect(permissionCellTitles[6].props.children).toBe(
      snapGetBip44EntropyTitle('Peercoin'),
    );
    expect(permissionCellTitles[7].props.children).toBe(
      snapGetBip44EntropyTitle('Namecoin'),
    );
    expect(permissionCellTitles[8].props.children).toBe(
      snapGetBip44EntropyTitle('Feathercoin'),
    );
    expect(permissionCellTitles[9].props.children).toBe(
      snapGetBip44EntropyTitle('Counterparty'),
    );
    expect(permissionCellTitles[10].props.children).toBe(
      snapGetBip44EntropyTitle('Blackcoin'),
    );
    expect(permissionCellTitles[11].props.children).toBe(
      snapGetBip44EntropyTitle('NuShares'),
    );
    expect(permissionCellTitles[12].props.children).toBe(
      snapGetBip44EntropyTitle('NuBits'),
    );
    expect(permissionCellTitles[13].props.children).toBe(
      snapGetBip44EntropyTitle('Mazacoin'),
    );
    expect(permissionCellTitles[14].props.children).toBe(
      snapGetBip44EntropyTitle('Viacoin'),
    );
    expect(permissionCellTitles[15].props.children).toBe(
      snapGetBip44EntropyTitle('ClearingHouse'),
    );
    expect(permissionCellTitles[16].props.children).toBe(
      snapGetBip44EntropyTitle('Rubycoin'),
    );
    expect(permissionCellTitles[17].props.children).toBe(
      snapGetBip44EntropyTitle('Groestlcoin'),
    );
    expect(permissionCellTitles[18].props.children).toBe(
      snapGetBip44EntropyTitle('Digitalcoin'),
    );
    expect(permissionCellTitles[19].props.children).toBe(
      snapGetBip44EntropyTitle('Cannacoin'),
    );
    expect(permissionCellTitles[20].props.children).toBe(
      snapGetBip44EntropyTitle('DigiByte'),
    );
    expect(permissionCellTitles[21].props.children).toBe(
      snapGetBip44EntropyTitle('Open Assets'),
    );
    expect(permissionCellTitles[22].props.children).toBe(
      snapGetBip44EntropyTitle('Monacoin'),
    );
    expect(permissionCellTitles[23].props.children).toBe(
      snapGetBip44EntropyTitle('Clams'),
    );
    expect(permissionCellTitles[24].props.children).toBe(
      snapGetBip44EntropyTitle('Primecoin'),
    );
    expect(permissionCellTitles[25].props.children).toBe(
      snapGetBip44EntropyTitle('Neoscoin'),
    );
    expect(permissionCellTitles[26].props.children).toBe(
      snapGetBip44EntropyTitle('Jumbucks'),
    );
    expect(permissionCellTitles[27].props.children).toBe(
      snapGetBip44EntropyTitle('ziftrCOIN'),
    );
    expect(permissionCellTitles[28].props.children).toBe(
      snapGetBip44EntropyTitle('Vertcoin'),
    );
    expect(permissionCellTitles[29].props.children).toBe(
      snapGetBip44EntropyTitle('NXT'),
    );
    expect(permissionCellTitles[30].props.children).toBe(
      snapGetBip44EntropyTitle('Burst'),
    );
    expect(permissionCellTitles[31].props.children).toBe(
      snapGetBip44EntropyTitle('MonetaryUnit'),
    );
    expect(permissionCellTitles[32].props.children).toBe(
      snapGetBip44EntropyTitle('Zoom'),
    );
    expect(permissionCellTitles[33].props.children).toBe(
      snapGetBip44EntropyTitle('Virtual Cash'),
    );
    expect(permissionCellTitles[34].props.children).toBe(
      snapGetBip44EntropyTitle('Canada eCoin'),
    );
    expect(permissionCellTitles[35].props.children).toBe(
      snapGetBip44EntropyTitle('ShadowCash'),
    );
    expect(permissionCellTitles[36].props.children).toBe(
      snapGetBip44EntropyTitle('ParkByte'),
    );
    expect(permissionCellTitles[37].props.children).toBe(
      snapGetBip44EntropyTitle('Pandacoin'),
    );
    expect(permissionCellTitles[38].props.children).toBe(
      snapGetBip44EntropyTitle('StartCOIN'),
    );
    expect(permissionCellTitles[39].props.children).toBe(
      snapGetBip44EntropyTitle('MOIN'),
    );
    expect(permissionCellTitles[40].props.children).toBe(
      snapGetBip44EntropyTitle('Expanse'),
    );
    expect(permissionCellTitles[41].props.children).toBe(
      snapGetBip44EntropyTitle('Einsteinium'),
    );
    expect(permissionCellTitles[42].props.children).toBe(
      snapGetBip44EntropyTitle('Decred'),
    );
    expect(permissionCellTitles[43].props.children).toBe(
      snapGetBip44EntropyTitle('NEM'),
    );
    expect(permissionCellTitles[44].props.children).toBe(
      snapGetBip44EntropyTitle('Particl'),
    );
    expect(permissionCellTitles[45].props.children).toBe(
      snapGetBip44EntropyTitle('Argentum (dead)'),
    );
    expect(permissionCellTitles[46].props.children).toBe(
      snapGetBip44EntropyTitle('Libertas'),
    );
    expect(permissionCellTitles[47].props.children).toBe(
      snapGetBip44EntropyTitle('Posw coin'),
    );
    expect(permissionCellTitles[48].props.children).toBe(
      snapGetBip44EntropyTitle('Shreeji'),
    );
    expect(permissionCellTitles[49].props.children).toBe(
      snapGetBip44EntropyTitle('Global Currency Reserve (GCRcoin)'),
    );
  });

  it('renders the correct permissions titles for snap_getBip32Entropy with specified protocols', () => {
    const mockPermissions: SnapPermissionsType = {
      snap_getBip32Entropy: [
        {
          path: ['m', "44'", "0'"],
          curve: 'secp256k1',
        },
        {
          path: ['m', "44'", "0'"],
          curve: 'ed25519',
        },
      ],
    };
    const { getAllByTestId } = render(
      <SnapPermissions permissions={mockPermissions} installedAt={mockDate} />,
    );
    const permissionCellTitles = getAllByTestId(SNAP_PERMISSIONS_TITLE);

    expect(permissionCellTitles.length).toBe(2);
    expect(permissionCellTitles[0].props.children).toBe(
      snapGetBip32EntropyTitle('Bitcoin Legacy'),
    );

    expect(permissionCellTitles[1].props.children).toBe(
      snapGetBip32EntropyTitle('Test BIP-32 Path (ed25519)'),
    );
  });

  it('renders the correct default text for snap_getBip32Entropy with invalid curves', () => {
    const mockPermissions: SnapPermissionsType = {
      snap_getBip32Entropy: [
        {
          path: ['m', "44'", "0'", '0'],
          curve: 'secp256k1',
        },
        {
          path: ['m', "44'", "0'", '3'],
          curve: 'ed25519',
        },
      ],
    };
    const { getAllByTestId } = render(
      <SnapPermissions permissions={mockPermissions} installedAt={mockDate} />,
    );
    const permissionCellTitles = getAllByTestId(SNAP_PERMISSIONS_TITLE);

    expect(permissionCellTitles.length).toBe(2);
    expect(permissionCellTitles[0].props.children).toBe(
      snapGetBip32EntropyTitle("m/44'/0'/0 (secp256k1)"),
    );

    expect(permissionCellTitles[1].props.children).toBe(
      snapGetBip32EntropyTitle("m/44'/0'/3 (ed25519)"),
    );
  });

  it('renders correctly with no permissions', () => {
    const permissions = {};
    const { queryByTestId } = render(
      <SnapPermissions permissions={permissions} installedAt={mockDate} />,
    );
    expect(queryByTestId(SNAP_PERMISSION_CELL)).toBeNull();
  });
});
