import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import Engine from '../../../../core/Engine';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import BatchAccountBalanceSettings from './';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID } from './BatchAccountBalanceSettings.constants';

let mockSetIsMultiAccountBalancesEnabled;

beforeEach(() => {
  mockSetIsMultiAccountBalancesEnabled.mockClear();
});

const mockEngine = Engine;

jest.mock('../../../../core/Engine', () => {
  mockSetIsMultiAccountBalancesEnabled = jest.fn();
  return {
    init: () => mockEngine.init({}),
    context: {
      PreferencesController: {
        setIsMultiAccountBalancesEnabled: mockSetIsMultiAccountBalancesEnabled,
      },
    },
  };
});

describe('BatchAccountBalanceSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        PreferencesController: {
          ...backgroundState.PreferencesController,
          isMultiAccountBalancesEnabled: false,
        },
      },
    },
  };

  it('should render correctly', () => {
    const tree = renderWithProvider(<BatchAccountBalanceSettings />, {
      state: initialState,
    });
    expect(tree).toMatchSnapshot();
  });

  it('should display correct initial state of multi-account balances toggle', () => {
    const stateWithMultiAccountBalancesEnabled = {
      ...initialState,
      engine: {
        backgroundState: {
          ...initialState.engine.backgroundState,
          PreferencesController: {
            ...initialState.engine.backgroundState.PreferencesController,
            isMultiAccountBalancesEnabled: true,
          },
        },
      },
    };

    const { getByTestId } = renderWithProvider(
      <BatchAccountBalanceSettings />,
      {
        state: stateWithMultiAccountBalancesEnabled,
      },
    );

    const multiAccountBalancesToggle = getByTestId(
      SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID,
    );

    expect(multiAccountBalancesToggle.props.value).toBe(true);
  });

  it('should call setIsMultiAccountBalancesEnabled when toggle is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <BatchAccountBalanceSettings />,
      {
        state: initialState,
      },
    );

    const multiAccountBalancesToggle = getByTestId(
      SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID,
    );

    fireEvent(multiAccountBalancesToggle, 'onValueChange', true);

    expect(mockSetIsMultiAccountBalancesEnabled).toHaveBeenCalledWith(true);
  });

  it('should call setIsMultiAccountBalancesEnabled with correct values when toggled', () => {
    const { getByTestId } = renderWithProvider(
      <BatchAccountBalanceSettings />,
      {
        state: initialState,
      },
    );

    const multiAccountBalancesToggle = getByTestId(
      SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID,
    );

    // Check initial state (false)
    expect(multiAccountBalancesToggle.props.value).toBe(false);

    // Simulate toggle press to true
    fireEvent(multiAccountBalancesToggle, 'onValueChange', true);

    // Check if setIsMultiAccountBalancesEnabled was called with true
    expect(mockSetIsMultiAccountBalancesEnabled).toHaveBeenCalledWith(true);

    // Simulate toggle press to false
    fireEvent(multiAccountBalancesToggle, 'onValueChange', false);

    // Check if setIsMultiAccountBalancesEnabled was called with false
    expect(mockSetIsMultiAccountBalancesEnabled).toHaveBeenCalledWith(false);
  });
});
