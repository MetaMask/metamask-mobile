import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { RootState } from '../../../../reducers';
import AccountPermissionsConfirmRevokeAll from './AccountPermissionsConfirmRevokeAll';
import { fireEvent } from '@testing-library/react-native';
import { BottomSheetRef } from 'app/component-library/components/BottomSheets/BottomSheet';

const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
      goBack: mockedGoBack,
    }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

const mockOnCloseBottomSheet = jest.fn();
jest.mock(
  '../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const React = require('react');
    return React.forwardRef((props: any, ref: React.Ref<BottomSheetRef>) => {
      React.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: () => {
          mockOnCloseBottomSheet();
        },
      }));
      return <div {...props} />;
    });
  },
);

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

// Mock PermissionController
const mockRevokeAllPermissions = jest
  .fn()
  .mockImplementation(async (hostname) => {
    return Promise.resolve();
  });

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PermissionController: {
        revokeAllPermissions: () => {
          mockRevokeAllPermissions();
        },
      },
    },
  },
}));

describe('AccountPermissionsConfirmRevokeAll', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <AccountPermissionsConfirmRevokeAll
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
          },
        }}
      />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('executes onCancel handler when Cancel button is pressed', () => {
    const { getByText } = renderWithProvider(
      <AccountPermissionsConfirmRevokeAll
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
          },
        }}
      />,
      { state: mockInitialState },
    );

    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
  });

  it('executes revokeAllAccounts handler when Disconnect button is pressed', async () => {
    const { getByText } = renderWithProvider(
      <AccountPermissionsConfirmRevokeAll
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
          },
        }}
      />,
      { state: mockInitialState },
    );

    const disconnectButton = getByText('Disconnect');
    fireEvent.press(disconnectButton);

    expect(mockRevokeAllPermissions).toHaveBeenCalled();
  });
});
