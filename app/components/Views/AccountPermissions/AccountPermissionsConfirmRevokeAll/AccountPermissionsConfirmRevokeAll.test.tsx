import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { RootState } from '../../../../reducers';
import AccountPermissionsConfirmRevokeAll from './AccountPermissionsConfirmRevokeAll';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';

const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();
const mockedOnRevokeAll = jest.fn();
let mockRouteParams: Record<string, unknown> = {};
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
      goBack: mockedGoBack,
      isFocused: jest.fn(() => true),
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
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
    mockRouteParams = {};
  });

  it('renders correctly', () => {
    mockRouteParams = {
      hostInfo: { metadata: { origin: 'test' } },
    };
    const { toJSON } = renderWithProvider(
      <AccountPermissionsConfirmRevokeAll />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('handles cancel button press', () => {
    mockRouteParams = {
      hostInfo: { metadata: { origin: 'test' } },
    };
    const { getByTestId } = renderWithProvider(
      <AccountPermissionsConfirmRevokeAll />,
      { state: mockInitialState },
    );

    const cancelButton = getByTestId('revoke-all-permissions-cancel-button');
    fireEvent.press(cancelButton);

    expect(mockedGoBack).toHaveBeenCalled();
  });

  it('handles revoke button press', () => {
    mockRouteParams = {
      hostInfo: { metadata: { origin: 'test' } },
      onRevokeAll: mockedOnRevokeAll,
    };
    const { getByTestId } = renderWithProvider(
      <AccountPermissionsConfirmRevokeAll />,
      { state: mockInitialState },
    );

    const revokeButton = getByTestId('confirm_disconnect_networks');
    fireEvent.press(revokeButton);

    expect(mockedOnRevokeAll).toHaveBeenCalled();
  });

  it('displays correct host information', () => {
    const testOrigin = 'test.example.com';
    mockRouteParams = {
      hostInfo: { metadata: { origin: testOrigin } },
    };
    const { getByText } = renderWithProvider(
      <AccountPermissionsConfirmRevokeAll />,
      { state: mockInitialState },
    );

    const expectedText = strings('accounts.reconnect_notice', {
      dappUrl: testOrigin,
    });

    expect(getByText(expectedText)).toBeTruthy();
  });
});
