import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import { mockUseBridgeQuoteData } from '../../_mocks_/useBridgeQuoteData.mock';
import { useBridgeQuoteDataContext } from '../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useHasSufficientGas } from '../../hooks/useHasSufficientGas';
import useIsInsufficientBalance from '../../hooks/useInsufficientBalance';
import { useInsufficientNativeReserveError } from '../../hooks/useInsufficientNativeReserveError';
import { useIsNetworkFeeUnavailable } from '../../hooks/useIsNetworkFeeUnavailable';
import { BridgeViewSelectorsIDs } from '../../Views/BridgeView/BridgeView.testIds';
import { SwapsLimitOrderConfirmButton } from './index';

const TEST_ID = BridgeViewSelectorsIDs.CONFIRM_BUTTON;
const DEFAULT_LABEL = 'Create Order';

jest.mock('../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => ({
  useBridgeQuoteDataContext: jest.fn(),
}));

jest.mock('../../hooks/useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useHasSufficientGas', () => ({
  useHasSufficientGas: jest.fn(),
}));

jest.mock('../../hooks/useInsufficientNativeReserveError', () => ({
  useInsufficientNativeReserveError: jest.fn(),
}));

jest.mock('../../hooks/useIsNetworkFeeUnavailable', () => ({
  useIsNetworkFeeUnavailable: jest.fn(),
}));

function mockSettledQuote(
  overrides: Partial<typeof mockUseBridgeQuoteData> = {},
) {
  jest.mocked(useBridgeQuoteDataContext).mockReturnValue({
    ...mockUseBridgeQuoteData,
    ...overrides,
  } as ReturnType<typeof useBridgeQuoteDataContext>);
}

function renderButton(
  props: Partial<
    React.ComponentProps<typeof SwapsLimitOrderConfirmButton>
  > = {},
) {
  const onPress = props.onPress ?? jest.fn();

  return {
    onPress,
    ...renderWithProvider(
      <SwapsLimitOrderConfirmButton
        onPress={onPress}
        label={DEFAULT_LABEL}
        testID={TEST_ID}
        {...props}
      />,
    ),
  };
}

describe('SwapsLimitOrderConfirmButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettledQuote();
    jest.mocked(useIsInsufficientBalance).mockReturnValue(false);
    jest.mocked(useInsufficientNativeReserveError).mockReturnValue(undefined);
    jest.mocked(useIsNetworkFeeUnavailable).mockReturnValue(false);
    jest.mocked(useHasSufficientGas).mockReturnValue(true);
  });

  it('calls onPress when pressed', () => {
    const { onPress, getByTestId } = renderButton();

    fireEvent.press(getByTestId(TEST_ID));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the provided label when funds and gas are sufficient', () => {
    const { getByTestId } = renderButton({ label: 'Place order' });

    expect(getByTestId(TEST_ID)).toHaveTextContent('Place order');
    expect(getByTestId(TEST_ID).props.accessibilityState?.disabled).toBeFalsy();
  });

  it('does not call onPress when disabled by the caller', () => {
    const { onPress, getByTestId } = renderButton({ disabled: true });

    fireEvent.press(getByTestId(TEST_ID));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const { onPress, getByTestId } = renderButton({ loading: true });

    fireEvent.press(getByTestId(TEST_ID));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('disables the button and shows insufficient funds when source balance is too low', () => {
    jest.mocked(useIsInsufficientBalance).mockReturnValue(true);

    const { onPress, getByTestId } = renderButton();
    fireEvent.press(getByTestId(TEST_ID));

    expect(getByTestId(TEST_ID)).toHaveTextContent(
      strings('bridge.insufficient_funds'),
    );
    expect(getByTestId(TEST_ID).props.accessibilityState?.disabled).toBe(true);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('disables the button and shows insufficient funds when native reserve is too low', () => {
    jest.mocked(useInsufficientNativeReserveError).mockReturnValue({
      minimumNativeBalanceToBeKeptInAccount: '10',
      maxSwappableNativeBalance: '40',
    });

    const { getByTestId } = renderButton();

    expect(getByTestId(TEST_ID)).toHaveTextContent(
      strings('bridge.insufficient_funds'),
    );
    expect(getByTestId(TEST_ID).props.accessibilityState?.disabled).toBe(true);
  });

  it('disables the button and shows insufficient funds when network fee is unavailable', () => {
    jest.mocked(useIsNetworkFeeUnavailable).mockReturnValue(true);

    const { getByTestId } = renderButton();

    expect(getByTestId(TEST_ID)).toHaveTextContent(
      strings('bridge.insufficient_funds'),
    );
    expect(getByTestId(TEST_ID).props.accessibilityState?.disabled).toBe(true);
  });

  it('disables the button and shows insufficient gas when gas token balance is too low', () => {
    jest.mocked(useHasSufficientGas).mockReturnValue(false);

    const { onPress, getByTestId } = renderButton();
    fireEvent.press(getByTestId(TEST_ID));

    expect(getByTestId(TEST_ID)).toHaveTextContent(
      strings('bridge.insufficient_gas'),
    );
    expect(getByTestId(TEST_ID).props.accessibilityState?.disabled).toBe(true);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('prefers insufficient funds over insufficient gas when both apply', () => {
    jest.mocked(useIsInsufficientBalance).mockReturnValue(true);
    jest.mocked(useHasSufficientGas).mockReturnValue(false);

    const { getByTestId } = renderButton();

    expect(getByTestId(TEST_ID)).toHaveTextContent(
      strings('bridge.insufficient_funds'),
    );
  });

  it('keeps the caller label while the quote is still loading', () => {
    mockSettledQuote({ isLoading: true });
    jest.mocked(useIsInsufficientBalance).mockReturnValue(true);
    jest.mocked(useHasSufficientGas).mockReturnValue(false);

    const { getByTestId } = renderButton();

    expect(getByTestId(TEST_ID)).toHaveTextContent(DEFAULT_LABEL);
    expect(getByTestId(TEST_ID).props.accessibilityState?.disabled).toBe(true);
  });

  it('keeps the caller label when there is no active quote yet', () => {
    mockSettledQuote({ activeQuote: undefined });
    jest.mocked(useIsInsufficientBalance).mockReturnValue(true);

    const { getByTestId } = renderButton();

    expect(getByTestId(TEST_ID)).toHaveTextContent(DEFAULT_LABEL);
    expect(getByTestId(TEST_ID).props.accessibilityState?.disabled).toBe(true);
  });

  it('hides the loading spinner when showing an insufficient funds label', () => {
    jest.mocked(useIsInsufficientBalance).mockReturnValue(true);

    const { getByTestId } = renderButton({ loading: true });

    expect(getByTestId(TEST_ID)).toHaveTextContent(
      strings('bridge.insufficient_funds'),
    );
  });
});
