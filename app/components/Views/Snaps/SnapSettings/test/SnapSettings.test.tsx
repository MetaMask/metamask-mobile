import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SemVerVersion, Status } from '@metamask/snaps-utils';
import SnapSettings from '../SnapSettings';
import {
  SNAP_DETAILS_CELL,
  SNAP_PERMISSIONS,
  SNAP_PERMISSION_CELL,
  SNAP_SETTINGS_REMOVE_BUTTON,
} from '../../../../../constants/test-ids';
import Engine from '../../../../../core/Engine';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    SnapController: {
      removeSnap: jest.fn(),
    },
  },
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
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
  createNavigationDetails: jest.fn(),
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
    const { getByTestId, getAllByTestId } = render(<SnapSettings />);

    const removeButton = getByTestId(SNAP_SETTINGS_REMOVE_BUTTON);
    const description = getByTestId(SNAP_DETAILS_CELL);
    const permissionContainer = getByTestId(SNAP_PERMISSIONS);
    const permissions = getAllByTestId(SNAP_PERMISSION_CELL);
    expect(removeButton).toBeTruthy();
    expect(description).toBeTruthy();
    expect(permissionContainer).toBeTruthy();
    expect(permissions.length).toBe(5);
    expect(removeButton.props.children[1].props.children).toBe(
      'Remove Filsnap',
    );
  });

  it('remove snap and goes back when Remove button is pressed', async () => {
    const { getByTestId } = render(<SnapSettings />);

    const removeButton = getByTestId(SNAP_SETTINGS_REMOVE_BUTTON);
    fireEvent(removeButton, 'onPress');
    expect(Engine.context.SnapController.removeSnap).toHaveBeenCalledWith(
      'npm:@chainsafe/filsnap',
    );
    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
