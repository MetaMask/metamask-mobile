import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import AccountPermissions from './AccountPermissions';
import { ConnectedAccountsSelectorsIDs } from '../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';
import { fireEvent } from '@testing-library/react-native';
import { AccountPermissionsScreens } from './AccountPermissions.types';

const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();
const mockedTrackEvent = jest.fn();

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

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockedTrackEvent,
  }),
}));

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

describe('AccountPermissions', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <AccountPermissions
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

  describe('AccountPermissionsConnected handlers', () => {
    it('should handle manage permissions button press and navigate to permissions summary', () => {
      const { getByTestId } = renderWithProvider(
        <AccountPermissions
          route={{
            params: {
              hostInfo: { metadata: { origin: 'test' } },
            },
          }}
        />,
        { state: mockInitialState },
      );

      const managePermissionsButton = getByTestId(
        ConnectedAccountsSelectorsIDs.MANAGE_PERMISSIONS,
      );
      fireEvent.press(managePermissionsButton);

      expect(getByTestId('permission-summary-container')).toBeDefined();
    });
  });

  it('should render connect more accounts screen when specified as initial screen', () => {
    const { getByText } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.ConnectMoreAccounts,
          },
        }}
      />,
      { state: mockInitialState },
    );

    expect(getByText('Connect more accounts')).toBeDefined();
  });
});
