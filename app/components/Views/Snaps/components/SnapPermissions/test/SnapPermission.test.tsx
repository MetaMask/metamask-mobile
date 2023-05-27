import React from 'react';
import { render } from '@testing-library/react-native';
import SnapPermissions from '../SnapPermissions';
import { SNAP_PERMISSION_CELL } from '../../../../../../constants/test-ids';
import { Bip32PublicKeyArgsStruct } from '@metamask/rpc-methods/dist/restricted/getBip32PublicKey';

describe('SnapPermissions', () => {
  const mockDate = 1684964145490;
  const longRunningTitle = 'Run indefinitely';
  const networkAccessTitle = 'Access the internet';
  const transactionInsightTitle = 'Display transaction insights';
  const cronjobTitle = 'Schedule and run periodic actions';
  const rpcTitle = 'Allow other snaps to communicate directly with this snap';
  const snapConfirmTitle = 'Display custom dialogs';
  const snapManageStateTitle = 'Store and manage data on your device';
  const snapNotifyTitle = 'Show notifications';
  const snapGetBip32EntropyTitle =
    'Control your [protocol] accounts and assets';
  const snapGetBip32PublicKeyTitle = 'View your public key for [protocol]';
  const snapGetBip44EntropyTitle = 'View your public key for [protocol]';
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

    expect(permissionCells.length).toBe(13);
    expect(permissionCells[0].props.children.props.title).toBe(
      longRunningTitle,
    );
    expect(permissionCells[1].props.children.props.title).toBe(
      networkAccessTitle,
    );
    expect(permissionCells[2].props.children.props.title).toBe(
      transactionInsightTitle,
    );
    expect(permissionCells[3].props.children.props.title).toBe(cronjobTitle);
    expect(permissionCells[4].props.children.props.title).toBe(rpcTitle);
    expect(permissionCells[5].props.children.props.title).toBe(
      snapConfirmTitle,
    );
    expect(permissionCells[6].props.children.props.title).toBe(
      snapManageStateTitle,
    );
    expect(permissionCells[7].props.children.props.title).toBe(snapNotifyTitle);
    expect(permissionCells[8].props.children.props.title).toBe(
      snapGetBip32EntropyTitle,
    );
    expect(permissionCells[9].props.children.props.title).toBe(
      snapGetBip32PublicKeyTitle,
    );
    expect(permissionCells[10].props.children.props.title).toBe(
      snapGetBip44EntropyTitle,
    );
    expect(permissionCells[11].props.children.props.title).toBe(
      snapGetEntropyTitle,
    );
    expect(permissionCells[12].props.children.props.title).toBe(
      endowmentKeyringTitle,
    );
  });

  it('renders correct installed date', () => {
    const permissions = {
      'endowment:network-access': {},
      'endowment:rpc': {
        dapps: true,
        snaps: true,
      },
    };
    const { getAllByTestId } = render(
      <SnapPermissions permissions={permissions} installedAt={mockDate} />,
    );
    const permissionCells = getAllByTestId(SNAP_PERMISSION_CELL);

    const expectedDate = 'Approved on May 24 at 5:35 pm';

    expect(permissionCells[0].props.children.props.secondaryText).toBe(
      expectedDate,
    );
    expect(permissionCells[1].props.children.props.secondaryText).toBe(
      expectedDate,
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
