import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Snap, SemVerVersion, Status } from '@metamask/snaps-utils';
import SnapDetails from '../SnapDetails';
import Engine from '../../../../../../core/Engine';
import {
  SNAP_DETAILS_CELL,
  SNAP_DETAILS_INSTALL_DATE,
  SNAP_DETAILS_INSTALL_ORIGIN,
  SNAP_DETAILS_SWITCH,
  SNAP_VERSION_BADGE,
} from '../../../../../../constants/test-ids';

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    SnapController: {
      enableSnap: jest.fn(),
      stopSnap: jest.fn(),
    },
  },
}));

describe('SnapDetails', () => {
  const mockSnap: Snap = {
    blocked: false,
    enabled: true,
    permissionName: 'wallet_snap_npm:@chainsafe/filsnap',
    id: 'npm:@chainsafe/filsnap',
    initialPermissions: {
      'endowment:network-access': {},
      'endowment:rpc': {
        dapps: true,
        snaps: true,
      },
      snap_confirm: {},
      snap_getBip44Entropy: [
        {
          coinType: 1,
        },
        {
          coinType: 461,
        },
      ],
      snap_manageState: {},
    },
    manifest: {
      version: '2.3.13' as SemVerVersion,
      proposedName: 'Filsnap',
      description: 'The Filecoin snap.',
      repository: {
        type: 'git',
        url: 'https://github.com/Chainsafe/filsnap.git',
      },
      source: {
        shasum: 'Z7lh6iD1yjfKES/WutUyxepg5Dgp8Xjo3kivsz9vpwc=',
        location: {
          npm: {
            filePath: 'dist/bundle.js',
            packageName: '@chainsafe/filsnap',
            registry: 'https://registry.npmjs.org/',
          },
        },
      },
      initialPermissions: {
        'endowment:network-access': {},
        'endowment:rpc': {
          dapps: true,
          snaps: true,
        },
        snap_confirm: {},
        snap_getBip44Entropy: [
          {
            coinType: 1,
          },
          {
            coinType: 461,
          },
        ],
        snap_manageState: {},
      },
      manifestVersion: '0.1',
    },
    status: 'runing' as Status,
    version: '2.3.13' as SemVerVersion,
    versionHistory: [
      {
        version: '2.3.13',
        date: 1684964145490,
        origin: 'metamask-mobile',
      },
    ],
  };

  const installDateString = 'Installed on May 24 at 5:35 pm';

  it('renders the correct snap details', async () => {
    const { getByTestId } = render(<SnapDetails snap={mockSnap} />);

    const cell = await getByTestId(SNAP_DETAILS_CELL);
    const switchElement = await getByTestId(SNAP_DETAILS_SWITCH);
    const installOrigin = await getByTestId(SNAP_DETAILS_INSTALL_ORIGIN);
    const installDate = await getByTestId(SNAP_DETAILS_INSTALL_DATE);
    const versionBadge = await getByTestId(SNAP_VERSION_BADGE);

    expect(cell).toBeTruthy();
    expect(switchElement).toBeTruthy();
    expect(installOrigin).toBeTruthy();
    expect(installDate).toBeTruthy();
    expect(versionBadge).toBeTruthy();

    expect(cell.props.children.props.title).toEqual(
      mockSnap.manifest.proposedName,
    );
    expect(cell.props.children.props.secondaryText).toEqual(mockSnap.id);

    expect(switchElement.props.value).toEqual(true);

    expect(installOrigin.props.children).toEqual('metamask-mobile');

    expect(installDate.props.children).toEqual(installDateString);
  });

  it('handles snap enable and disable', async () => {
    const { getByTestId } = render(<SnapDetails snap={mockSnap} />);

    const switchElement = await getByTestId(SNAP_DETAILS_SWITCH);

    fireEvent(switchElement, 'onValueChange', false);

    expect(Engine.context.SnapController.stopSnap).toHaveBeenCalledWith(
      mockSnap.id,
    );

    expect(switchElement.props.value).toEqual(false);

    fireEvent(switchElement, 'onValueChange', true);

    expect(Engine.context.SnapController.enableSnap).toHaveBeenCalledWith(
      mockSnap.id,
    );

    expect(switchElement.props.value).toEqual(true);
  });
});
