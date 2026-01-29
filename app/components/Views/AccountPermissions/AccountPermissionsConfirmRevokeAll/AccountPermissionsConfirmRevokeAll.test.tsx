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
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
      goBack: mockedGoBack,
    }),
    useRoute: () => mockUseRoute(),
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
    mockUseRoute.mockReturnValue({
      params: {
        hostInfo: { metadata: { origin: 'test' } },
      },
    });

    const { toJSON } = renderWithProvider(
      <AccountPermissionsConfirmRevokeAll />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('handles cancel button press', () => {
    mockUseRoute.mockReturnValue({
      params: {
        hostInfo: { metadata: { origin: 'test' } },
      },
    });

    const { getByTestId } = renderWithProvider(
      <AccountPermissionsConfirmRevokeAll />,
      { state: mockInitialState },
    );

    const cancelButton = getByTestId('revoke-all-permissions-cancel-button');
    fireEvent.press(cancelButton);

    expect(mockedGoBack).toHaveBeenCalled();
  });

  it('handles revoke button press', () => {
    mockUseRoute.mockReturnValue({
      params: {
        hostInfo: { metadata: { origin: 'test' } },
        onRevokeAll: mockedOnRevokeAll,
      },
    });

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
    mockUseRoute.mockReturnValue({
      params: {
        hostInfo: { metadata: { origin: testOrigin } },
      },
    });

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
