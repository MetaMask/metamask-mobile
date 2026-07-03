import React from 'react';
import { render } from '@testing-library/react-native';
import CreditRefundTooltipSheet from './CreditRefundTooltipSheet';

let mockIsMoneyAccount = true;

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { isMoneyAccount: mockIsMoneyAccount } }),
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
      'card.credit_screen.refund_info.title': 'Refund balance',
      'card.credit_screen.refund_info.description':
        "This balance includes any refunds you've received. It's the first balance your card purchases will pull from. It can be moved to your Money account anytime.",
      'card.credit_screen.refund_info.description_no_money_account':
        "This balance includes any refunds you've received. It's the first balance your card purchases will pull from. It can be redeemed to your wallet anytime.",
    };
    return mockStrings[key] || key;
  }),
}));

describe('CreditRefundTooltipSheet', () => {
  beforeEach(() => {
    mockIsMoneyAccount = true;
  });

  it('renders the title and description without a Got it button', () => {
    const { getByText, queryByTestId } = render(<CreditRefundTooltipSheet />);

    expect(getByText('Refund balance')).toBeOnTheScreen();
    expect(
      getByText(
        "This balance includes any refunds you've received. It's the first balance your card purchases will pull from. It can be moved to your Money account anytime.",
      ),
    ).toBeOnTheScreen();
    expect(queryByTestId('credit-refund-tooltip-got-it-button')).toBeNull();
  });

  it('uses wallet wording when the destination is not the Money account', () => {
    mockIsMoneyAccount = false;

    const { getByText, queryByText } = render(<CreditRefundTooltipSheet />);

    expect(
      getByText(
        "This balance includes any refunds you've received. It's the first balance your card purchases will pull from. It can be redeemed to your wallet anytime.",
      ),
    ).toBeOnTheScreen();
    expect(queryByText(/Money account/)).toBeNull();
  });
});
