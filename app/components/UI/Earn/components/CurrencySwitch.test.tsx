import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import CurrencyToggle from './CurrencySwitch';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { selectStablecoinLendingEnabledFlag } from '../selectors/featureFlags';

jest.mock('../selectors/featureFlags', () => ({
  selectStablecoinLendingEnabledFlag: jest.fn(),
}));

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('CurrencyToggle', () => {
  const mockProps = {
    onPress: jest.fn(),
    value: '200.00',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(false);
  });

  const renderComponent = (state = mockInitialState, props = mockProps) =>
    renderWithProvider(<CurrencyToggle {...props} />, {
      state,
    });

  it('renders correctly when stablecoin lending is disabled', () => {
    const { getByTestId, getByText } = renderComponent();

    expect(getByTestId('currency-toggle')).toBeTruthy();
    expect(getByText('200.00')).toBeTruthy();
  });

  it('renders correctly when stablecoin lending is enabled and usd is currency', () => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(true);

    const { getByTestId, getByText } = renderComponent();

    expect(getByTestId('currency-toggle')).toBeTruthy();
    expect(getByText('200.00')).toBeTruthy();
  });

  it('calls onPress when button is pressed', () => {
    const { getByTestId } = renderComponent();

    fireEvent.press(getByTestId('currency-toggle'));
    expect(mockProps.onPress).toHaveBeenCalledTimes(1);
  });

  it('renders with correct styles', () => {
    const { getByTestId } = renderComponent();

    const button = getByTestId('currency-toggle');
    expect(button.props.style).toMatchObject({
      backgroundColor: expect.any(String),
      borderColor: expect.any(String),
      borderWidth: 1,
    });
  });
});
