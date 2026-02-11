import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import BatchAccountBalanceSettings from './';
import { SECURITY_PRIVACY_MULTI_ACCOUNT_BALANCES_TOGGLE_ID } from './index.constants';

let mockSetIsMultiAccountBalancesEnabled: jest.Mock;

beforeEach(() => {
  mockSetIsMultiAccountBalancesEnabled.mockClear();
});

const mockEngine = Engine;

jest.mock('../../../../core/Engine', () => {
  mockSetIsMultiAccountBalancesEnabled = jest.fn();
  return {
    init: () => mockEngine.init(''),
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

    expect(multiAccountBalancesToggle.props.value).toBe(false);

    fireEvent(multiAccountBalancesToggle, 'onValueChange', true);

    expect(mockSetIsMultiAccountBalancesEnabled).toHaveBeenCalledWith(true);

    fireEvent(multiAccountBalancesToggle, 'onValueChange', false);

    expect(mockSetIsMultiAccountBalancesEnabled).toHaveBeenCalledWith(false);
  });
});
