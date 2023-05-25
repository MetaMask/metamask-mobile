import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SemVerVersion, Status } from '@metamask/snaps-utils';
import SnapSettings from '../SnapSettings';
import { SNAP_SETTINGS_REMOVE_BUTTON } from '../../../../../constants/test-ids';

jest.mock('../../../../util/navigation/navUtils', () => ({
  useParams: () => ({
    snap: {
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
    },
  }),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      setOptions: jest.fn(),
      goBack: mockGoBack,
    }),
  };
});

describe('SnapSettings', () => {
  it('renders correctly', () => {
    const { getByTestId } = render(<SnapSettings />);

    const removeButton = getByTestId(SNAP_SETTINGS_REMOVE_BUTTON);
    expect(removeButton).toBeTruthy();
  });

  it('goes back when remove button is pressed', () => {
    const { getByTestId } = render(<SnapSettings />);

    const removeButton = getByTestId(SNAP_SETTINGS_REMOVE_BUTTON);
    fireEvent.press(removeButton);
    expect(mockGoBack).toHaveBeenCalled();
  });
});
