import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { mockTheme } from '../../../../../util/theme';
import MoneyAccountSelector, {
  MONEY_ACCOUNT_SELECTOR_TEST_IDS,
} from './MoneyAccountSelector';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: (
    styleFn: (params: {
      theme: typeof mockTheme;
    }) => Record<string, Record<string, unknown>>,
  ) => ({
    styles: styleFn({ theme: mockTheme }),
    theme: mockTheme,
  }),
}));

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text: RNText } = jest.requireActual('react-native');
  const MockText = ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    style?: unknown;
    variant?: string;
    testID?: string;
  }) => <RNText {...props}>{children}</RNText>;
  return {
    __esModule: true,
    default: MockText,
    TextVariant: { BodySMMedium: 'BodySMMedium' },
  };
});

describe('MoneyAccountSelector', () => {
  const mockOnAccountSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders label and empty input when no address provided', () => {
    const { getByTestId, getByText } = render(
      <MoneyAccountSelector onAccountSelected={mockOnAccountSelected} />,
    );

    expect(
      getByTestId(MONEY_ACCOUNT_SELECTOR_TEST_IDS.LABEL),
    ).toBeOnTheScreen();
    expect(getByText('transaction.recipient_address')).toBeOnTheScreen();
    expect(
      getByTestId(MONEY_ACCOUNT_SELECTOR_TEST_IDS.INPUT),
    ).toBeOnTheScreen();
    expect(getByTestId(MONEY_ACCOUNT_SELECTOR_TEST_IDS.INPUT).props.value).toBe(
      '',
    );
  });

  it('renders input with selectedAddress value when provided', () => {
    const address = '0x1234567890123456789012345678901234567890';
    const { getByTestId } = render(
      <MoneyAccountSelector
        selectedAddress={address}
        onAccountSelected={mockOnAccountSelected}
      />,
    );

    expect(getByTestId(MONEY_ACCOUNT_SELECTOR_TEST_IDS.INPUT).props.value).toBe(
      address,
    );
  });

  it('calls onAccountSelected when text changes', () => {
    const { getByTestId } = render(
      <MoneyAccountSelector onAccountSelected={mockOnAccountSelected} />,
    );

    fireEvent.changeText(
      getByTestId(MONEY_ACCOUNT_SELECTOR_TEST_IDS.INPUT),
      '0xABCDEF',
    );

    expect(mockOnAccountSelected).toHaveBeenCalledWith('0xABCDEF');
  });

  it('renders custom label when label prop provided', () => {
    const { getByText } = render(
      <MoneyAccountSelector
        label="From address"
        onAccountSelected={mockOnAccountSelected}
      />,
    );

    expect(getByText('From address')).toBeOnTheScreen();
  });
});
