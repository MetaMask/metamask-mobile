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
    const permissionCellTitles = getAllByTestId(SNAP_PERMISSIONS_TITLE);

    expect(permissionCells.length).toBe(13);
    expect(permissionCellTitles[0].props.children).toBe(longRunningTitle);
    expect(permissionCellTitles[1].props.children).toBe(networkAccessTitle);
    expect(permissionCellTitles[2].props.children).toBe(
      transactionInsightTitle,
    );
    expect(permissionCellTitles[3].props.children).toBe(cronjobTitle);
    expect(permissionCellTitles[4].props.children).toBe(rpcTitle);
    expect(permissionCellTitles[5].props.children).toBe(snapConfirmTitle);
    expect(permissionCellTitles[6].props.children).toBe(snapManageStateTitle);
    expect(permissionCellTitles[7].props.children).toBe(snapNotifyTitle);
    expect(permissionCellTitles[8].props.children).toBe(
      snapGetBip32EntropyTitle,
    );
    expect(permissionCellTitles[9].props.children).toBe(
      snapGetBip32PublicKeyTitle,
    );
    expect(permissionCellTitles[10].props.children).toBe(
      snapGetBip44EntropyTitle,
    );
    expect(permissionCellTitles[11].props.children).toBe(snapGetEntropyTitle);
    expect(permissionCellTitles[12].props.children).toBe(endowmentKeyringTitle);
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
    const permissionCellDates = getAllByTestId(SNAP_PERMISSIONS_DATE);

    const expectedDate = 'Approved on May 24 at 5:35 pm';

    expect(permissionCellDates[0].props.children).toBe(expectedDate);
    expect(permissionCellDates[1].props.children).toBe(expectedDate);
  });

  it('renders correctly with no permissions', () => {
    const permissions = {};
    const { queryByTestId } = render(
      <SnapPermissions permissions={permissions} installedAt={mockDate} />,
    );
    expect(queryByTestId(SNAP_PERMISSION_CELL)).toBeNull();
  });
});
