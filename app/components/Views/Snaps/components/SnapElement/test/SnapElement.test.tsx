import React from 'react';
import { render } from '@testing-library/react-native';
import SnapElement from '../SnapElement';
import { Snap, Status, SnapIds } from '@metamask/snaps-utils';
import { SemVerVersion } from '@metamask/utils';
import SNAP_ElEMENT from '../SnapElement.constants';

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
    id: 'npm:@chainsafe/filsnap' as SnapIds,
    initialPermissions: {
      'endowment:network-access': {},
      'endowment:rpc': {
        dapps: true,
        snaps: true,
      },
      snap_getBip44Entropy: {
        coinTypes: [1, 461],
      },
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
        snap_getBip44Entropy: {
          coinTypes: [1, 461],
        },
        snap_manageState: {},
      },
      manifestVersion: '0.1',
    },
    status: 'running' as Status,
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
});
