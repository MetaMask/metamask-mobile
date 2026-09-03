///: BEGIN:ONLY_INCLUDE_IF(snaps)
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Snap, Status } from '@metamask/snaps-utils';
import { SnapId } from '@metamask/snaps-sdk';
import { SemVerVersion } from '@metamask/utils';
import SnapsSettingsList from './SnapsSettingsList';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { strings } from '../../../../../locales/i18n';
import {
  SNAPS_SETTINGS_LIST_BACK_BUTTON,
  SNAPS_SETTINGS_LIST_HEADER,
} from './SnapsSettingsList.constants';
import SNAP_ELEMENT from '../components/SnapElement/SnapElement.constants';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: jest.fn(),
    }),
  };
});

const createMockSnap = (id: SnapId, proposedName: string): Snap =>
  ({
    blocked: false,
    enabled: true,
    id,
    permissionName: `wallet_snap_${id}`,
    initialPermissions: {},
    manifest: {
      proposedName,
      version: '1.0.0' as SemVerVersion,
      description: 'Test snap',
      manifestVersion: '0.1',
      initialPermissions: {},
      source: {
        shasum: 'abc',
        location: {
          npm: {
            filePath: 'dist/bundle.js',
            packageName: String(id).replace('npm:', ''),
            registry: 'https://registry.npmjs.org/',
          },
        },
      },
    },
    status: 'running' as Status,
    version: '1.0.0' as SemVerVersion,
    versionHistory: [],
  }) as Snap;

const createStateWithSnaps = (snaps: Record<string, Snap>) => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      SnapController: {
        isReady: true,
        snapStates: {},
        snaps,
        unencryptedSnapStates: {},
      },
    },
  },
});

const initialState = createStateWithSnaps({});

describe('SnapsSettingsList', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('renders HeaderStandard with snaps title and back button', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <SnapsSettingsList />,
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        state: initialState as any,
      },
    );

    expect(getByTestId(SNAPS_SETTINGS_LIST_HEADER)).toBeOnTheScreen();
    expect(getByTestId(SNAPS_SETTINGS_LIST_BACK_BUTTON)).toBeOnTheScreen();
    expect(getByText(strings('app_settings.snaps.title'))).toBeOnTheScreen();
  });

  it('calls navigation.goBack when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<SnapsSettingsList />, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state: initialState as any,
    });

    fireEvent(getByTestId(SNAPS_SETTINGS_LIST_BACK_BUTTON), 'onPress');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders SnapElement for each installed snap', () => {
    const filsnap = createMockSnap(
      'npm:@chainsafe/filsnap' as SnapId,
      'Filsnap',
    );
    const exampleSnap = createMockSnap(
      'npm:@metamask/example-snap' as SnapId,
      'Example Snap',
    );
    const state = createStateWithSnaps({
      [filsnap.id]: filsnap,
      [exampleSnap.id]: exampleSnap,
    });

    const { getAllByTestId, getByText } = renderWithProvider(
      <SnapsSettingsList />,
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        state: state as any,
      },
    );

    expect(getAllByTestId(SNAP_ELEMENT)).toHaveLength(2);
    expect(getByText(filsnap.manifest.proposedName)).toBeOnTheScreen();
    expect(getByText(exampleSnap.manifest.proposedName)).toBeOnTheScreen();
  });
});
///: END:ONLY_INCLUDE_IF
