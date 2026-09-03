import React from 'react';
import { render } from '@testing-library/react-native';
import CreditBalanceTooltipSheet from './CreditBalanceTooltipSheet';
import { CreditBalanceTooltipSheetSelectors } from './CreditBalanceTooltipSheet.testIds';

let mockRouteParams: Record<string, unknown> | undefined;

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const MockBottomSheet = ReactActual.forwardRef(
      (
        { children, testID }: { children: React.ReactNode; testID?: string },
        _ref: React.Ref<unknown>,
      ) => <View testID={testID}>{children}</View>,
    );
    return { __esModule: true, default: MockBottomSheet };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ children }: { children: React.ReactNode }) => (
        <View>{children}</View>
      ),
    };
  },
);

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'card.credit_balance_tooltip.title': 'Available balance',
      'card.credit_balance_tooltip.description':
        "Your balance is made up of your Money account balance and any refunds you've received.",
      'card.credit_balance_tooltip.description_no_money_account':
        "Your balance is made up of your wallet balance and any refunds you've received.",
      'card.credit_balance_tooltip.money_account': 'Money account',
      'card.credit_balance_tooltip.wallet': 'Wallet',
      'card.credit_balance_tooltip.refund_balance': 'Refund balance',
    };
    return mockStrings[key] || key;
  }),
}));

describe('CreditBalanceTooltipSheet', () => {
  beforeEach(() => {
    mockRouteParams = undefined;
  });

  it('renders the breakdown amounts from route params', () => {
    mockRouteParams = {
      moneyAccountAmount: '$1,000.00',
      refundAmount: '$10.86',
      isMoneyAccount: true,
    };

    const { getByTestId, getByText } = render(<CreditBalanceTooltipSheet />);

    expect(getByText('Money account')).toBeOnTheScreen();
    expect(getByText('Refund balance')).toBeOnTheScreen();
    expect(
      getByTestId(CreditBalanceTooltipSheetSelectors.MONEY_ACCOUNT_AMOUNT),
    ).toHaveTextContent('$1,000.00');
    expect(
      getByTestId(CreditBalanceTooltipSheetSelectors.REFUND_AMOUNT),
    ).toHaveTextContent('$10.86');
  });

  it('renders empty amounts gracefully when no params are provided', () => {
    const { getByTestId } = render(<CreditBalanceTooltipSheet />);

    expect(
      getByTestId(CreditBalanceTooltipSheetSelectors.MONEY_ACCOUNT_AMOUNT),
    ).toHaveTextContent('');
    expect(
      getByTestId(CreditBalanceTooltipSheetSelectors.REFUND_AMOUNT),
    ).toHaveTextContent('');
  });

  it('uses wallet wording (no Money account) when the balance is not the Money account', () => {
    mockRouteParams = {
      moneyAccountAmount: '$1,000.00',
      refundAmount: '$10.86',
      isMoneyAccount: false,
    };

    const { getByText, queryByText } = render(<CreditBalanceTooltipSheet />);

    expect(getByText('Wallet')).toBeOnTheScreen();
    expect(queryByText('Money account')).not.toBeOnTheScreen();
    expect(
      getByText(
        "Your balance is made up of your wallet balance and any refunds you've received.",
      ),
    ).toBeOnTheScreen();
  });
});
