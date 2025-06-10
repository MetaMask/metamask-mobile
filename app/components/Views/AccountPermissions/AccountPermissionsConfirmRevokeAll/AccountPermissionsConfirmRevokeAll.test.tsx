import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { RootState } from '../../../../reducers';
import AccountPermissionsConfirmRevokeAll from './AccountPermissionsConfirmRevokeAll';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { endTrace, trace, TraceName } from '../../../../util/trace';
import Engine from '../../../../core/Engine';

const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();
const mockedOnRevokeAll = jest.fn();
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

jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    DisconnectAllPermissions: 'Disconnect All Accounts Permissions',
  },
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PermissionController: {
      revokeAllPermissions: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('AccountPermissionsConfirmRevokeAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('handles cancel button press', () => {
    const { getByTestId } = renderWithProvider(
      <AccountPermissionsConfirmRevokeAll
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
          },
        }}
      />,
      { state: mockInitialState },
    );

    const cancelButton = getByTestId('revoke-all-permissions-cancel-button');
    fireEvent.press(cancelButton);

    expect(mockedGoBack).toHaveBeenCalled();
  });

  it('handles revoke button press with onRevokeAll function provided', async () => {
    const { getByTestId } = renderWithProvider(
      <AccountPermissionsConfirmRevokeAll
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            onRevokeAll: mockedOnRevokeAll,
          },
        }}
      />,
      { state: mockInitialState },
    );

    const revokeButton = getByTestId('confirm_disconnect_networks');
    fireEvent.press(revokeButton);

    // Wait for async operations to complete
    await waitFor(() => {
      expect(mockedOnRevokeAll).toHaveBeenCalled();
    });

    // Should NOT call the Engine's permission controller when callback is provided
    expect(
      Engine.context.PermissionController.revokeAllPermissions,
    ).not.toHaveBeenCalled();

    // Both trace functions should be called regardless of callback presence
    expect(trace).toHaveBeenCalledWith({
      name: TraceName.DisconnectAllPermissions,
    });
    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.DisconnectAllPermissions,
    });
  });

  it('handles revoke button press with no onRevokeAll function passed', async () => {
    const { getByTestId } = renderWithProvider(
      <AccountPermissionsConfirmRevokeAll
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            onRevokeAll: undefined,
          },
        }}
      />,
      { state: mockInitialState },
    );
    const revokeButton = getByTestId('confirm_disconnect_networks');

    fireEvent.press(revokeButton);

    // Wait for async operation to complete
    await waitFor(() => {
      expect(
        Engine.context.PermissionController.revokeAllPermissions,
      ).toHaveBeenCalledWith('test');
    });

    expect(trace).toHaveBeenCalledWith({
      name: TraceName.DisconnectAllPermissions,
    });
    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.DisconnectAllPermissions,
    });
  });

  it('displays correct host information', () => {
    const testOrigin = 'test.example.com';
    const { getByText } = renderWithProvider(
      <AccountPermissionsConfirmRevokeAll
        route={{
          params: {
            hostInfo: { metadata: { origin: testOrigin } },
          },
        }}
      />,
      { state: mockInitialState },
    );

    const expectedText = strings('accounts.reconnect_notice', {
      dappUrl: testOrigin,
    });

    expect(getByText(expectedText)).toBeTruthy();
  });
});
