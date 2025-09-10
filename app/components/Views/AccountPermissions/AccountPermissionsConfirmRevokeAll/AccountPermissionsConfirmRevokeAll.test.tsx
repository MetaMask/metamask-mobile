import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { RootState } from '../../../../reducers';
import AccountPermissionsConfirmRevokeAll from './AccountPermissionsConfirmRevokeAll';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import { RootParamList } from '../../../../util/navigation/types';
import { StackNavigationProp } from '@react-navigation/stack';

const mockedNavigate = jest.fn() as unknown as StackNavigationProp<
  RootParamList,
  'RevokeAllAccountPermissions'
>;
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
        navigation={mockedNavigate}
        route={{
          key: 'RevokeAllAccountPermissions',
          name: 'RevokeAllAccountPermissions',
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
        navigation={mockedNavigate}
        route={{
          key: 'RevokeAllAccountPermissions',
          name: 'RevokeAllAccountPermissions',
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

  it('handles revoke button press', () => {
    const { getByTestId } = renderWithProvider(
      <AccountPermissionsConfirmRevokeAll
        navigation={mockedNavigate}
        route={{
          key: 'RevokeAllAccountPermissions',
          name: 'RevokeAllAccountPermissions',
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

    expect(mockedOnRevokeAll).toHaveBeenCalled();
  });

  it('displays correct host information', () => {
    const testOrigin = 'test.example.com';
    const { getByText } = renderWithProvider(
      <AccountPermissionsConfirmRevokeAll
        navigation={mockedNavigate}
        route={{
          key: 'RevokeAllAccountPermissions',
          name: 'RevokeAllAccountPermissions',
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
