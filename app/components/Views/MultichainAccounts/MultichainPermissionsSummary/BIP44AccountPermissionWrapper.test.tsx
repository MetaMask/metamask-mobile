import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { BIP44AccountPermissionWrapper } from './BIP44AccountPermissionWrapper';
import { AccountPermissionsProps } from '../../AccountPermissions/AccountPermissions.types';

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
  const mockProps: AccountPermissionsProps = {
    route: {
      params: {
        hostInfo: {
          metadata: {
            origin: 'test.com',
          },
        },
      },
    },
  } as AccountPermissionsProps;

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

    return render(
      <Provider store={store}>
        <BIP44AccountPermissionWrapper {...mockProps} />
      </Provider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when feature flag is enabled', () => {
    it('should render MultichainAccountPermissions component', () => {
      const featureFlagEnabled = true;

      renderWithProvider(featureFlagEnabled);

      expect(MockedMultichainAccountPermissions).toHaveBeenCalledWith(
        mockProps,
        {},
      );
      expect(MockedAccountPermissions).not.toHaveBeenCalled();
    });

    it('should pass all props to MultichainAccountPermissions', () => {
      const customProps = {
        ...mockProps,
        route: {
          params: {
            hostInfo: {
              metadata: {
                origin: 'custom-test.com',
              },
            },
          },
        },
      };
      const featureFlagEnabled = true;
      const store = createMockStore(featureFlagEnabled);

      render(
        <Provider store={store}>
          <BIP44AccountPermissionWrapper {...customProps} />
        </Provider>,
      );

      expect(MockedMultichainAccountPermissions).toHaveBeenCalledWith(
        customProps,
        {},
      );
    });
  });

  describe('when feature flag is disabled', () => {
    it('should render AccountPermissions component', () => {
      const featureFlagEnabled = false;

      renderWithProvider(featureFlagEnabled);

      expect(MockedAccountPermissions).toHaveBeenCalledWith(mockProps, {});
      expect(MockedMultichainAccountPermissions).not.toHaveBeenCalled();
    });

    it('should pass all props to AccountPermissions', () => {
      const customProps = {
        ...mockProps,
        route: {
          params: {
            hostInfo: {
              metadata: {
                origin: 'legacy-test.com',
              },
            },
          },
        },
      };
      const featureFlagEnabled = false;
      const store = createMockStore(featureFlagEnabled);

      render(
        <Provider store={store}>
          <BIP44AccountPermissionWrapper {...customProps} />
        </Provider>,
      );

      expect(MockedAccountPermissions).toHaveBeenCalledWith(customProps, {});
    });
  });
});
