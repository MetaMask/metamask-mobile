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
  const snapGetBip32EntropyTitle =
    'Control your [protocol] accounts and assets';
  const snapGetBip32PublicKeyTitle = 'View your public key for [protocol]';
  const snapGetBip44EntropyTitle = (protocol: string) =>
    `Control your ${protocol} accounts and assets`;
  const snapGetEntropyTitle = 'View your public key for [protocol]';
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
          path: ['m', '44', '0', '0', '0'],
          curve: 'ed25519',
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
      snapGetBip32EntropyTitle,
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
  });

  it('renders correctly with no permissions', () => {
    const permissions = {};
    const { queryByTestId } = render(
      <SnapPermissions permissions={permissions} installedAt={mockDate} />,
    );
    expect(queryByTestId(SNAP_PERMISSION_CELL)).toBeNull();
  });
});
