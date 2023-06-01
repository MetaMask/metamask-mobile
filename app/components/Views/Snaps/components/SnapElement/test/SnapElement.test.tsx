import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SemVerVersion, Snap, Status } from '@metamask/snaps-utils';
import SnapElement from '../SnapElement';
import { SNAP_ElEMENT } from '../../../../../../constants/test-ids';
import { createSnapSettingsNavDetails } from '../../../SnapSettings/SnapSettings';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('SnapElement', () => {
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

  it('renders correctly', () => {
    const { getByTestId } = render(<SnapElement {...mockSnap} />);

    const cell = getByTestId(SNAP_ElEMENT);
    expect(cell.props.children.props.title).toEqual(
      mockSnap.manifest.proposedName,
    );
    expect(cell.props.children.props.secondaryText).toEqual(mockSnap.id);
  });

  it('navigates when pressed', () => {
    const { getByTestId } = render(<SnapElement {...mockSnap} />);

    const cell = getByTestId(SNAP_ElEMENT);
    fireEvent.press(cell);
    expect(mockNavigate).toHaveBeenCalledWith(
      ...createSnapSettingsNavDetails({ snap: mockSnap }),
    );
  });
});
