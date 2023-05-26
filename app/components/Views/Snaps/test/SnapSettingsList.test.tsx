import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import SnapsSettingsList from '../SnapsSettingsList';
import { SemVerVersion, Snap, Status } from '@metamask/snaps-utils';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { SNAP_ElEMENT } from '../../../../constants/test-ids';
import { createSnapSettingsNavDetails } from '../SnapSettings/SnapSettings';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: jest.fn(),
  }),
}));

describe('SnapsSettingsList', () => {
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

  const mockSnap2: Snap = {
    blocked: false,
    enabled: true,
    permissionName: 'wallet_snap_npm:@lavamoat/tss-snap',
    id: 'npm:@lavamoat/tss-snap',
    initialPermissions: {
      snap_manageState: {},
      'endowment:rpc': {
        dapps: true,
        snaps: false,
      },
    },
    manifest: {
      version: '0.2.0' as SemVerVersion,
      description:
        'Snap using threshold signatures to sign messages and transactions.',
      proposedName: 'Threshold Signatures',
      repository: {
        type: 'git',
        url: 'https://github.com/LavaMoat/tss-snap',
      },
      source: {
        shasum: 'cXhvie+xy84HqQFW+1dae44e0EV/kr8PUzt+6u+09eE=',
        location: {
          npm: {
            filePath: 'bundle.js',
            iconPath: 'images/icon.svg',
            packageName: '@lavamoat/tss-snap',
            registry: 'https://registry.npmjs.org/',
          },
        },
      },
      initialPermissions: {
        snap_manageState: {},
        'endowment:rpc': {
          dapps: true,
          snaps: false,
        },
      },
      manifestVersion: '0.1',
    },
    status: 'stopped' as Status,
    version: '0.2.0' as SemVerVersion,
    versionHistory: [
      {
        version: '0.2.0',
        date: 1684872159230,
        origin: 'tss.ac',
      },
    ],
  };
  const mockSnaps: Snap[] = [mockSnap, mockSnap2];

  const engineState = {
    engine: {
      backgroundState: {
        SnapController: {
          snaps: mockSnaps,
          processRequestedSnap: jest.fn(),
        },
      },
    },
  };

  it('renders correctly', () => {
    const { getByPlaceholderText, getByText } = renderWithProvider(
      <SnapsSettingsList />,
      { state: engineState },
    );
    expect(getByPlaceholderText('Snap to install')).toBeTruthy();
    expect(getByText('Install Snap')).toBeTruthy();
  });

  it('renders the dev settings when __DEV__ is true', () => {
    // Mock the __DEV__ flag
    global.__DEV__ = true;
    const { queryByText } = renderWithProvider(<SnapsSettingsList />, {
      state: engineState,
    });

    const installButton = queryByText('Install Snap');
    expect(installButton).toBeTruthy();
  });

  it('does not render the dev settings when __DEV__ is false (production)', () => {
    // Mock the __DEV__ flag
    global.__DEV__ = false;

    const { queryByText } = renderWithProvider(<SnapsSettingsList />, {
      state: engineState,
    });

    const installButton = queryByText('Install Snap');
    const textInput = queryByText('Snap to install');
    expect(installButton).toBeNull();
    expect(textInput).toBeNull();
  });

  it('renders the list of SnapElements correctly', () => {
    const { getAllByTestId } = renderWithProvider(<SnapsSettingsList />, {
      state: engineState,
    });
    const snapElements = getAllByTestId(SNAP_ElEMENT);
    expect(snapElements.length).toBe(2);
  });

  it('navigates to SnapSettings when SnapElement is tapped', () => {
    const { getAllByTestId } = renderWithProvider(<SnapsSettingsList />, {
      state: engineState,
    });

    const snapElement = getAllByTestId(SNAP_ElEMENT); // adjust to get specific SnapElement if there are multiple
    fireEvent.press(snapElement[0]);
    expect(mockNavigate).toHaveBeenCalledWith(
      ...createSnapSettingsNavDetails({ snap: mockSnap }),
    );
    fireEvent.press(snapElement[1]);
    expect(mockNavigate).toHaveBeenCalledWith(
      ...createSnapSettingsNavDetails({ snap: mockSnap2 }),
    );
  });
});
