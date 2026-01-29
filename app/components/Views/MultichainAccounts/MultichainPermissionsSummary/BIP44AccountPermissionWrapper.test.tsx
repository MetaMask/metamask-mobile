import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { BIP44AccountPermissionWrapper } from './BIP44AccountPermissionWrapper';

jest.mock('../../AccountPermissions/AccountPermissions', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock(
  '../MultichainAccountPermissions/MultichainAccountPermissions',
  () => ({
    MultichainAccountPermissions: jest.fn(() => null),
  }),
);

jest.mock(
  '../../../../selectors/featureFlagController/multichainAccounts',
  () => ({
    selectMultichainAccountsState2Enabled: jest.fn(),
  }),
);

const mockUseRoute = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: () => mockUseRoute(),
  };
});

import AccountPermissions from '../../AccountPermissions/AccountPermissions';
import { MultichainAccountPermissions } from '../MultichainAccountPermissions/MultichainAccountPermissions';
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts';

const MockedAccountPermissions = AccountPermissions as jest.MockedFunction<
  typeof AccountPermissions
>;
const MockedMultichainAccountPermissions =
  MultichainAccountPermissions as jest.MockedFunction<
    typeof MultichainAccountPermissions
  >;
const mockSelectMultichainAccountsState2Enabled =
  selectMultichainAccountsState2Enabled as jest.MockedFunction<
    typeof selectMultichainAccountsState2Enabled
  >;

describe('BIP44AccountPermissionWrapper', () => {
  const mockRouteParams = {
    hostInfo: {
      metadata: {
        origin: 'test.com',
      },
    },
  };

  const createMockStore = (featureFlagEnabled: boolean) => {
    const mockState = {
      engine: {
        backgroundState: {},
      },
    };

    mockSelectMultichainAccountsState2Enabled.mockReturnValue(
      featureFlagEnabled,
    );

    return createStore(() => mockState);
  };

  const renderWithProvider = (featureFlagEnabled: boolean) => {
    const store = createMockStore(featureFlagEnabled);

    mockUseRoute.mockReturnValue({ params: mockRouteParams });

    return render(
      <Provider store={store}>
        <BIP44AccountPermissionWrapper />
      </Provider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when feature flag is enabled', () => {
    it('renders MultichainAccountPermissions component', () => {
      const featureFlagEnabled = true;

      renderWithProvider(featureFlagEnabled);

      expect(MockedMultichainAccountPermissions).toHaveBeenCalledWith(
        expect.objectContaining({
          route: { params: mockRouteParams },
        }),
        {},
      );
      expect(MockedAccountPermissions).not.toHaveBeenCalled();
    });

    it('passes all props to MultichainAccountPermissions', () => {
      const customRouteParams = {
        hostInfo: {
          metadata: {
            origin: 'custom-test.com',
          },
        },
      };
      const featureFlagEnabled = true;
      const store = createMockStore(featureFlagEnabled);

      mockUseRoute.mockReturnValue({ params: customRouteParams });

      render(
        <Provider store={store}>
          <BIP44AccountPermissionWrapper />
        </Provider>,
      );

      expect(MockedMultichainAccountPermissions).toHaveBeenCalledWith(
        expect.objectContaining({
          route: { params: customRouteParams },
        }),
        {},
      );
    });
  });

  describe('when feature flag is disabled', () => {
    it('renders AccountPermissions component', () => {
      const featureFlagEnabled = false;

      renderWithProvider(featureFlagEnabled);

      expect(MockedAccountPermissions).toHaveBeenCalledWith(
        expect.objectContaining({
          route: { params: mockRouteParams },
        }),
        {},
      );
      expect(MockedMultichainAccountPermissions).not.toHaveBeenCalled();
    });

    it('passes all props to AccountPermissions', () => {
      const customRouteParams = {
        hostInfo: {
          metadata: {
            origin: 'legacy-test.com',
          },
        },
      };
      const featureFlagEnabled = false;
      const store = createMockStore(featureFlagEnabled);

      mockUseRoute.mockReturnValue({ params: customRouteParams });

      render(
        <Provider store={store}>
          <BIP44AccountPermissionWrapper />
        </Provider>,
      );

      expect(MockedAccountPermissions).toHaveBeenCalledWith(
        expect.objectContaining({
          route: { params: customRouteParams },
        }),
        {},
      );
    });
  });
});
