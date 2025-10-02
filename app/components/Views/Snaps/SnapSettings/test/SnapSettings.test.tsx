import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Snap, SnapStatus, Status } from '@metamask/snaps-utils';
import SnapSettings from '../SnapSettings';
import Engine from '../../../../../core/Engine';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  PermissionConstraint,
  SubjectPermissions,
} from '@metamask/permission-controller';
import { SemVerVersion } from '@metamask/utils';
import { SNAP_SETTINGS_REMOVE_BUTTON } from '../SnapSettings.constants';
import { SNAP_DETAILS_CELL } from '../../components/SnapDetails/SnapDetails.constants';
import SNAP_PERMISSIONS from '../../components/SnapPermissions/SnapPermissions.contants';
import { SNAP_PERMISSION_CELL } from '../../components/SnapPermissionCell/SnapPermissionCell.constants';
import { SnapId } from '@metamask/snaps-sdk';
import {
  createMockAccountsControllerState,
  createMockAccountsControllerStateWithSnap,
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
} from '../../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  KEYRING_SNAP_REMOVAL_WARNING,
  KEYRING_SNAP_REMOVAL_WARNING_CONTINUE,
  KEYRING_SNAP_REMOVAL_WARNING_TEXT_INPUT,
} from '../../KeyringSnapRemovalWarning/KeyringSnapRemovalWarning.constants';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
]);

jest.mock('react-native-safe-area-context', () => {
  // using disting digits for mock rects to make sure they are not mixed up
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  const frame = { width: 5, height: 6, x: 7, y: 8 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

const mockUseParams = jest.fn();
jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockUseParams(),
  createNavigationDetails: jest.fn(),
}));

const mockDate = 1684964145490;
const mockDate2 = 1686081721987;

const mockPermissions: SubjectPermissions<PermissionConstraint> = {
  'endowment:network-access': {
    id: 'Bjj3InYtb6U4ak-uja0f_',
    parentCapability: 'endowment:network-access',
    invoker: 'npm:@chainsafe/filsnap',
    caveats: null,
    date: mockDate,
  },
  'endowment:rpc': {
    id: 'Zma-vejrSvLtHmLrbSBAX',
    parentCapability: 'endowment:rpc',
    invoker: 'npm:@chainsafe/filsnap',
    caveats: [
      {
        type: 'rpcOrigin',
        value: {
          dapps: true,
          snaps: true,
        },
      },
    ],
    date: mockDate2,
  },
  snap_confirm: {
    id: 'tVtSEUjc48Ab-gF6UI7X3',
    parentCapability: 'snap_confirm',
    invoker: 'npm:@chainsafe/filsnap',
    caveats: null,
    date: mockDate2,
  },
  snap_manageState: {
    id: 'BKbg3uDSHHu0D1fCUTOmS',
    parentCapability: 'snap_manageState',
    invoker: 'npm:@chainsafe/filsnap',
    caveats: null,
    date: mockDate2,
  },
  snap_getBip44Entropy: {
    id: 'MuqnOW-7BRg94sRDmVnDK',
    parentCapability: 'snap_getBip44Entropy',
    invoker: 'npm:@chainsafe/filsnap',
    caveats: [
      {
        type: 'permittedCoinTypes',
        value: [
          {
            coinType: 1,
          },
          {
            coinType: 461,
          },
        ],
      },
    ],
    date: mockDate2,
  },
};

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

const initialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      PermissionController: {
        subjects: {
          'npm:@chainsafe/filsnap': {
            permissions: mockPermissions,
          },
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const mockSnap = {
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

jest.mock('../../../../../core/Engine', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const { MOCK_ADDRESS_1, MOCK_ADDRESS_2 } = jest.requireActual(
    '../../../../../util/test/accountsControllerTestUtils',
  );
  return {
    getSnapKeyring: jest.fn().mockReturnValue({
      type: 'Snap Keyring',
      getAccountsBySnapId: jest
        .fn()
        .mockReturnValue([
          MOCK_ADDRESS_1.toLowerCase(),
          MOCK_ADDRESS_2.toLowerCase(),
        ]),
    }),
    removeAccount: jest.fn(),
    context: {
      SnapController: {
        removeSnap: jest.fn(),
      },
      KeyringController: {
        state: {
          keyrings: [
            {
              accounts: [MOCK_ADDRESS_1.toLowerCase()],
              index: 0,
              type: 'Snap Keyring',
            },
            {
              accounts: [MOCK_ADDRESS_2.toLowerCase()],
              index: 1,
              type: 'Snap Keyring',
            },
          ],
        },
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  };
});

describe('SnapSettings with non keyring snap', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockUseParams.mockReturnValue({
      snap: mockSnap,
    });
  });

  it('renders correctly', () => {
    const { getAllByTestId, getByTestId } = renderWithProvider(
      <SnapSettings />,
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        state: initialState as any,
      },
    );

    const removeButton = getByTestId(SNAP_SETTINGS_REMOVE_BUTTON);
    const description = getByTestId(SNAP_DETAILS_CELL);
    const permissionContainer = getByTestId(SNAP_PERMISSIONS);
    const permissions = getAllByTestId(SNAP_PERMISSION_CELL);
    expect(removeButton).toBeTruthy();
    expect(description).toBeTruthy();
    expect(permissionContainer).toBeTruthy();
    expect(permissions.length).toBe(7);
    expect(removeButton.props.children[1].props.children).toBe(
      'Remove Filsnap',
    );
  });

  it('remove snap and goes back when Remove button is pressed', async () => {
    const { getByTestId } = renderWithProvider(<SnapSettings />, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state: initialState as any,
    });

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

describe('SnapSettings with keyring snap', () => {
  const mockSnapName = 'MetaMask Simple Snap Keyring';
  const mockKeyringSnapId = 'npm:@metamask/snap-simple-keyring-snap' as SnapId;
  const mockKeyringSnap: Snap = {
    blocked: false,
    enabled: true,
    id: mockKeyringSnapId,
    initialPermissions: {
      'endowment:keyring': {
        allowedOrigins: ['https://metamask.github.io', 'metamask.github.io'],
      },
      'endowment:rpc': {
        dapps: true,
      },
      snap_manageAccounts: {},
      snap_manageState: {},
    },
    manifest: {
      version: '1.1.6' as SemVerVersion,
      description: 'An example of a key management snap for a simple keyring.',
      proposedName: mockSnapName,
      repository: {
        type: 'git',
        url: 'git+https://github.com/MetaMask/snap-simple-keyring.git',
      },
      source: {
        shasum: 'P2BbaJn6jb7+ecBF6mJJnheQ4j8dtEZ8O4FLqLv8e8M=',
        location: {
          npm: {
            filePath: 'dist/bundle.js',
            iconPath: 'images/icon.svg',
            packageName: '@metamask/snap-simple-keyring-snap',
            registry: 'https://registry.npmjs.org/',
          },
        },
      },
      initialPermissions: {
        'endowment:keyring': {
          allowedOrigins: ['https://metamask.github.io', 'metamask.github.io'],
        },
        'endowment:rpc': {
          dapps: true,
        },
        snap_manageAccounts: {},
        snap_manageState: {},
      },
      manifestVersion: '0.1',
    },
    status: 'stopped' as SnapStatus,
    sourceCode: '',
    version: '1.1.6' as SemVerVersion,
    versionHistory: [
      {
        version: '1.1.6',
        date: 1727403640652,
        origin: 'https://metamask.github.io',
      },
    ],
    auxiliaryFiles: [],
    localizationFiles: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({
      snap: mockKeyringSnap,
    });
  });

  const MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SNAP =
    createMockAccountsControllerStateWithSnap([MOCK_ADDRESS_1, MOCK_ADDRESS_2]);

  const mockKeyringSnapPermissions: SubjectPermissions<PermissionConstraint> = {
    'endowment:keyring': {
      id: 'Bjj3InYtb6U4ak-uja0f_',
      parentCapability: 'endowment:keyring',
      invoker: 'npm:@chainsafe/filsnap',
      caveats: null,
      date: mockDate,
    },
    snap_manageAccounts: {
      id: 'BKbg3uDSHHu0D1fCUTOmS',
      parentCapability: 'snap_manageAccounts',
      invoker: mockKeyringSnapId,
      caveats: null,
      date: mockDate2,
    },
  };

  const initialStateWithKeyringSnap = {
    settings: {},
    engine: {
      backgroundState: {
        ...backgroundState,
        PermissionController: {
          subjects: {
            [mockKeyringSnapId]: {
              permissions: mockKeyringSnapPermissions,
            },
          },
        },
        AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_SNAP,
      },
    },
  };

  it('renders KeyringSnapRemovalWarning when removing a keyring snap', async () => {
    const { getByTestId } = renderWithProvider(<SnapSettings />, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state: initialStateWithKeyringSnap as any,
    });

    // Needed to allow for useEffect to run
    // eslint-disable-next-line no-empty-function
    await act(async () => {});

    const removeButton = getByTestId(SNAP_SETTINGS_REMOVE_BUTTON);
    fireEvent.press(removeButton);
    await waitFor(() => {
      expect(getByTestId(KEYRING_SNAP_REMOVAL_WARNING)).toBeTruthy();
    });
  });

  it('calls Engine.context.SnapController and Engine.removeAccount when removing a keyring snap with accounts', async () => {
    const { getByTestId } = renderWithProvider(<SnapSettings />, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state: initialStateWithKeyringSnap as any,
    });

    // Needed to allow for useEffect to run
    // eslint-disable-next-line no-empty-function
    await act(async () => {});

    // Step 1: // Trigger the remove snap action
    const removeButton = getByTestId(SNAP_SETTINGS_REMOVE_BUTTON);
    fireEvent.press(removeButton);

    // Step 2: Click continue on the warning modal
    const keyringSnapRemovalWarningContinueButton = getByTestId(
      KEYRING_SNAP_REMOVAL_WARNING_CONTINUE,
    );
    fireEvent.press(keyringSnapRemovalWarningContinueButton);

    // Step 3: Wait for the warning modal to appear and enter the snap name
    await waitFor(() => {
      const inputField = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_TEXT_INPUT);
      expect(inputField).toBeTruthy();
    });
    const inputField = getByTestId(KEYRING_SNAP_REMOVAL_WARNING_TEXT_INPUT);
    fireEvent.changeText(inputField, mockKeyringSnap.manifest.proposedName);

    // Step 4: Click the continue button
    fireEvent.press(keyringSnapRemovalWarningContinueButton);

    // Step 5: Verify that the removal functions are called
    await waitFor(() => {
      expect(Engine.context.SnapController.removeSnap).toHaveBeenCalledWith(
        mockKeyringSnapId,
      );
      expect(Engine.removeAccount).toHaveBeenCalledTimes(2);
      expect(Engine.removeAccount).toHaveBeenCalledWith(
        MOCK_ADDRESS_1.toLowerCase(),
      );
      expect(Engine.removeAccount).toHaveBeenCalledWith(
        MOCK_ADDRESS_2.toLowerCase(),
      );
    });
  });
});
