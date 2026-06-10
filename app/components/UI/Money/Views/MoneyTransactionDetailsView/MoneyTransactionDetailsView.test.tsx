import React from 'react';
import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { merge } from 'lodash';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import { otherControllersMock } from '../../../../Views/confirmations/__mocks__/controllers/other-controllers-mock';
import MoneyTransactionDetailsView from './MoneyTransactionDetailsView';

jest.mock(
  '../../../../Views/confirmations/hooks/activity/useTransactionDetails',
);
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), setOptions: jest.fn() }),
}));

jest.mock('./MoneyTransactionDetailsDateRow', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    MoneyTransactionDetailsDateRow: () =>
      ReactActual.createElement(Text, { testID: 'date-row' }, 'date'),
  };
});
jest.mock(
  '../../../../Views/confirmations/components/activity/transaction-details-network-fee-row',
  () => {
    const ReactActual = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return {
      TransactionDetailsNetworkFeeRow: () =>
        ReactActual.createElement(
          Text,
          { testID: 'network-fee' },
          'network-fee',
        ),
    };
  },
);
jest.mock(
  '../../../../Views/confirmations/components/activity/transaction-details-bridge-fee-row',
  () => {
    const ReactActual = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return {
      TransactionDetailsBridgeFeeRow: () =>
        ReactActual.createElement(Text, { testID: 'bridge-fee' }, 'bridge-fee'),
    };
  },
);
jest.mock(
  '../../../../Views/confirmations/components/activity/transaction-details-total-row',
  () => {
    const ReactActual = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return {
      TransactionDetailsTotalRow: () =>
        ReactActual.createElement(Text, { testID: 'total-row' }, 'total'),
    };
  },
);
jest.mock(
  '../../../../Views/confirmations/components/activity/transaction-details-paid-with-row',
  () => {
    const ReactActual = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return {
      TransactionDetailsPaidWithRow: () =>
        ReactActual.createElement(Text, { testID: 'paid-with' }, 'paid-with'),
    };
  },
);
jest.mock(
  '../../../../Views/confirmations/components/activity/transaction-details-retry',
  () => {
    const ReactActual = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return {
      TransactionDetailsRetry: () =>
        ReactActual.createElement(Text, { testID: 'retry' }, 'retry'),
    };
  },
);
jest.mock('./MoneyTransactionDetailsFromRow', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    MoneyTransactionDetailsFromRow: () =>
      ReactActual.createElement(Text, { testID: 'from-row' }, 'from'),
  };
});
jest.mock('./MoneyTransactionDetailsToRow', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    MoneyTransactionDetailsToRow: () =>
      ReactActual.createElement(Text, { testID: 'to-row' }, 'to'),
  };
});
jest.mock('./MoneyTransactionDetailsOrderIdRow', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    MoneyTransactionDetailsOrderIdRow: () =>
      ReactActual.createElement(Text, { testID: 'order-id-row' }, 'order-id'),
  };
});
jest.mock('./MoneyTransactionDetailsHero', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    MoneyTransactionDetailsHero: () =>
      ReactActual.createElement(Text, { testID: 'hero' }, 'hero'),
  };
});
jest.mock('./MoneyTransactionDetailsStatusRow', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    MoneyTransactionDetailsStatusRow: () =>
      ReactActual.createElement(Text, { testID: 'status-row' }, 'status'),
  };
});
jest.mock('./MoneyTransactionDetailsSummary', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    MoneyTransactionDetailsSummary: () =>
      ReactActual.createElement(Text, { testID: 'summary' }, 'summary'),
  };
});

const CHAIN_ID_MOCK = '0x8f';

function render(type: TransactionType, metamaskPay?: Record<string, unknown>) {
  jest.mocked(useTransactionDetails).mockReturnValue({
    transactionMeta: {
      id: 'tx-1',
      chainId: CHAIN_ID_MOCK,
      type,
      time: Date.now(),
      txParams: { from: '0xabc' },
      metamaskPay,
    } as unknown as TransactionMeta,
  });
  return renderWithProvider(<MoneyTransactionDetailsView />, {
    state: merge({}, otherControllersMock),
  });
}

describe('MoneyTransactionDetailsView', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the back button', () => {
    const { getByTestId } = render(TransactionType.moneyAccountDeposit);
    expect(
      getByTestId('money-transaction-details-back-button'),
    ).toBeOnTheScreen();
  });

  it('renders hero, status, and date rows', () => {
    const { getByTestId } = render(TransactionType.moneyAccountDeposit);
    expect(getByTestId('hero')).toBeOnTheScreen();
    expect(getByTestId('status-row')).toBeOnTheScreen();
    expect(getByTestId('date-row')).toBeOnTheScreen();
  });

  it('renders from and to rows', () => {
    const { getByTestId } = render(TransactionType.moneyAccountWithdraw);
    expect(getByTestId('from-row')).toBeOnTheScreen();
    expect(getByTestId('to-row')).toBeOnTheScreen();
  });

  it('renders fee rows', () => {
    const { getByTestId } = render(TransactionType.moneyAccountDeposit);
    expect(getByTestId('network-fee')).toBeOnTheScreen();
    expect(getByTestId('bridge-fee')).toBeOnTheScreen();
    expect(getByTestId('total-row')).toBeOnTheScreen();
  });

  it('renders summary section for deposit types', () => {
    const { getByTestId } = render(TransactionType.moneyAccountDeposit);
    expect(getByTestId('summary')).toBeOnTheScreen();
  });

  it('renders summary section for musdConversion', () => {
    const { getByTestId } = render(TransactionType.musdConversion);
    expect(getByTestId('summary')).toBeOnTheScreen();
  });

  it('renders summary section for perpsDeposit', () => {
    const { getByTestId } = render(TransactionType.perpsDeposit);
    expect(getByTestId('summary')).toBeOnTheScreen();
  });

  it('renders summary section for predictDeposit', () => {
    const { getByTestId } = render(TransactionType.predictDeposit);
    expect(getByTestId('summary')).toBeOnTheScreen();
  });

  it('renders summary section for moneyAccountWithdraw', () => {
    const { getByTestId } = render(TransactionType.moneyAccountWithdraw);
    expect(getByTestId('summary')).toBeOnTheScreen();
  });

  describe('title resolution', () => {
    it('shows "Sent" for moneyAccountWithdraw', () => {
      const { getByText } = render(TransactionType.moneyAccountWithdraw);
      expect(getByText('Sent')).toBeOnTheScreen();
    });

    it('shows "Sent" for perpsDeposit', () => {
      const { getByText } = render(TransactionType.perpsDeposit);
      expect(getByText('Sent')).toBeOnTheScreen();
    });

    it('shows "Sent" for predictDeposit', () => {
      const { getByText } = render(TransactionType.predictDeposit);
      expect(getByText('Sent')).toBeOnTheScreen();
    });

    it('shows "Deposited mUSD" for musdConversion', () => {
      const { getByText } = render(TransactionType.musdConversion);
      expect(getByText('Deposited mUSD')).toBeOnTheScreen();
    });

    it('shows "Deposited mUSD" for moneyAccountDeposit without fiat order', () => {
      const { getByText } = render(TransactionType.moneyAccountDeposit);
      expect(getByText('Deposited mUSD')).toBeOnTheScreen();
    });

    it('shows "Deposit" for moneyAccountDeposit with fiat order', () => {
      const { getByText } = render(TransactionType.moneyAccountDeposit, {
        fiat: { orderId: 'order-123', provider: 'transak' },
      });
      expect(getByText('Deposit')).toBeOnTheScreen();
    });
  });
});
