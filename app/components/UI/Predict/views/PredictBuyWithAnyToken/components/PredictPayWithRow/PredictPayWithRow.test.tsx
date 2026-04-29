import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { PredictPayWithRow } from './PredictPayWithRow';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import Routes from '../../../../../../../constants/navigation/Routes';
import { isHardwareAccount } from '../../../../../../../util/address';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

let mockPayToken: {
  symbol?: string;
  address?: string;
  chainId?: string;
  balanceFiat?: string;
} | null = null;
jest.mock(
  '../../../../../../Views/confirmations/hooks/pay/useTransactionPayToken',
  () => ({
    useTransactionPayToken: () => ({ payToken: mockPayToken }),
  }),
);

let mockTransactionMeta: {
  txParams?: { from?: string };
} | null = null;
jest.mock(
  '../../../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
  () => ({
    useTransactionMetadataRequest: () => mockTransactionMeta,
  }),
);

jest.mock('../../../../../../Views/confirmations/components/token-icon', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return {
    TokenIcon: ({ address, chainId }: { address: string; chainId: string }) => (
      <RNView testID={`token-icon-${address}-${chainId}`} />
    ),
    TokenIconVariant: { Row: 'Row' },
  };
});

let mockIsPredictBalanceSelected = false;
let mockSelectedPaymentToken: { symbol?: string } | null = null;
jest.mock('../../../../hooks/usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    isPredictBalanceSelected: mockIsPredictBalanceSelected,
    selectedPaymentToken: mockSelectedPaymentToken,
  }),
}));

jest.mock('../../hooks/usePredictDefaultPaymentToken', () => ({
  usePredictDefaultPaymentToken: jest.fn(),
}));

jest.mock('../../../../../../../util/address', () => ({
  isHardwareAccount: jest.fn(() => false),
}));

let mockHasTransactionType = true;
jest.mock('../../../../../../Views/confirmations/utils/transaction', () => ({
  hasTransactionType: (transactionMeta: unknown) => {
    if (!transactionMeta) return false;
    return mockHasTransactionType;
  },
}));

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    if (key === 'confirm.label.pay_with') return 'Pay with';
    if (key === 'predict.order.predict_balance_first')
      return 'Predict balance used first';
    return key;
  },
}));

jest.mock('../../../../../../Views/confirmations/constants/predict', () => ({
  POLYGON_USDCE: {
    address: '0xUSDCe',
    decimals: 6,
    name: 'USDC.e',
    symbol: 'USDC.e',
  },
}));

jest.mock('../../../../constants/transactions', () => ({
  PREDICT_BALANCE_CHAIN_ID: '0x89',
}));

let mockPredictBalance = 150.66;
jest.mock('../../../../hooks/usePredictBalance', () => ({
  usePredictBalance: () => ({ data: mockPredictBalance }),
}));

const mockIsHardwareAccount = isHardwareAccount as jest.MockedFunction<
  typeof isHardwareAccount
>;

describe('PredictPayWithRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPayToken = { symbol: 'USDC', address: '0xToken', chainId: '0x89' };
    mockTransactionMeta = { txParams: { from: '0xUserAddress' } };
    mockIsPredictBalanceSelected = false;
    mockSelectedPaymentToken = null;
    mockIsHardwareAccount.mockReturnValue(false);
    mockHasTransactionType = true;
  });

  it('renders label with payToken symbol', () => {
    renderWithProvider(<PredictPayWithRow />);

    expect(screen.getByText('Pay with USDC')).toBeOnTheScreen();
  });

  it('renders "Predict balance" when predict balance is selected', () => {
    mockIsPredictBalanceSelected = true;

    renderWithProvider(<PredictPayWithRow />);

    expect(screen.getByText('Pay with Predict balance')).toBeOnTheScreen();
  });

  it('uses selectedPaymentToken symbol when available and not predict balance', () => {
    mockSelectedPaymentToken = { symbol: 'MATIC' };

    renderWithProvider(<PredictPayWithRow />);

    expect(screen.getByText('Pay with MATIC')).toBeOnTheScreen();
  });

  it('renders TokenIcon with payToken address and chainId', () => {
    renderWithProvider(<PredictPayWithRow />);

    expect(screen.getByTestId('token-icon-0xToken-0x89')).toBeOnTheScreen();
  });

  it('renders TokenIcon with POLYGON_USDCE when predict balance selected', () => {
    mockIsPredictBalanceSelected = true;

    renderWithProvider(<PredictPayWithRow />);

    expect(screen.getByTestId('token-icon-0xUSDCe-0x89')).toBeOnTheScreen();
  });

  it('does not render TokenIcon when payToken has no address', () => {
    mockPayToken = { symbol: 'USDC' };

    renderWithProvider(<PredictPayWithRow />);

    expect(screen.queryByTestId(/token-icon/)).toBeNull();
  });

  it('navigates to pay-with modal on press', () => {
    renderWithProvider(<PredictPayWithRow />);

    fireEvent.press(screen.getByText('Pay with USDC'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.CONFIRMATION_PAY_WITH_MODAL,
    );
  });

  it('does not navigate when disabled prop is true', () => {
    renderWithProvider(<PredictPayWithRow disabled />);

    fireEvent.press(screen.getByText('Pay with USDC'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate for hardware accounts', () => {
    mockIsHardwareAccount.mockReturnValue(true);

    renderWithProvider(<PredictPayWithRow />);

    fireEvent.press(screen.getByText('Pay with USDC'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('hides arrow icon when disabled', () => {
    const { toJSON } = renderWithProvider(<PredictPayWithRow disabled />);
    const tree = JSON.stringify(toJSON());

    expect(tree).not.toContain('ArrowDown');
  });

  it('hides arrow icon for hardware accounts', () => {
    mockIsHardwareAccount.mockReturnValue(true);

    const { toJSON } = renderWithProvider(<PredictPayWithRow />);
    const tree = JSON.stringify(toJSON());

    expect(tree).not.toContain('ArrowDown');
  });

  it('falls back to Predict balance when payToken is null', () => {
    mockPayToken = null;

    renderWithProvider(<PredictPayWithRow />);

    expect(screen.getByText('Pay with Predict balance')).toBeOnTheScreen();
  });

  it('renders with no transactionMeta without crashing', () => {
    mockTransactionMeta = null;

    renderWithProvider(<PredictPayWithRow />);

    expect(screen.getByText('Pay with USDC')).toBeOnTheScreen();
  });

  it('renders ArrowRight icon when chevronRight is true', () => {
    const { toJSON } = renderWithProvider(<PredictPayWithRow chevronRight />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('ArrowRight');
    expect(tree).not.toContain('ArrowDown');
  });

  it('renders ArrowDown icon by default (chevronRight false)', () => {
    const { toJSON } = renderWithProvider(<PredictPayWithRow />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('ArrowDown');
    expect(tree).not.toContain('ArrowRight');
  });

  it('does not navigate when transactionMeta is null', () => {
    mockTransactionMeta = null;

    renderWithProvider(<PredictPayWithRow />);
    fireEvent.press(screen.getByText('Pay with USDC'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('hides arrow icon when transactionMeta is null', () => {
    mockTransactionMeta = null;

    const { toJSON } = renderWithProvider(<PredictPayWithRow />);
    const tree = JSON.stringify(toJSON());

    expect(tree).not.toContain('ArrowDown');
  });

  it('applies muted background when canEdit is true', () => {
    const { toJSON } = renderWithProvider(<PredictPayWithRow />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('backgroundColor');
  });

  it('does not apply muted background when disabled', () => {
    const { toJSON } = renderWithProvider(<PredictPayWithRow disabled />);
    const tree = JSON.stringify(toJSON());

    expect(tree).not.toContain('backgroundColor');
  });

  it('does not apply muted background when transactionMeta is null', () => {
    mockTransactionMeta = null;

    const { toJSON } = renderWithProvider(<PredictPayWithRow />);
    const tree = JSON.stringify(toJSON());

    expect(tree).not.toContain('backgroundColor');
  });

  it('does not apply muted background for hardware accounts', () => {
    mockIsHardwareAccount.mockReturnValue(true);

    const { toJSON } = renderWithProvider(<PredictPayWithRow />);
    const tree = JSON.stringify(toJSON());

    expect(tree).not.toContain('backgroundColor');
  });

  it('renders predict balance first hint when external token selected', () => {
    mockIsPredictBalanceSelected = false;

    renderWithProvider(<PredictPayWithRow />);

    expect(screen.getByText('Predict balance used first')).toBeOnTheScreen();
  });

  it('hides predict balance first hint when predict balance selected', () => {
    mockIsPredictBalanceSelected = true;

    renderWithProvider(<PredictPayWithRow />);

    expect(
      screen.queryByText('Predict balance used first'),
    ).not.toBeOnTheScreen();
  });

  it('does not navigate when transaction is not predictDepositAndOrder', () => {
    mockHasTransactionType = false;

    renderWithProvider(<PredictPayWithRow />);
    fireEvent.press(screen.getByText('Pay with USDC'));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('hides arrow icon when transaction is not predictDepositAndOrder', () => {
    mockHasTransactionType = false;

    const { toJSON } = renderWithProvider(<PredictPayWithRow />);
    const tree = JSON.stringify(toJSON());

    expect(tree).not.toContain('ArrowDown');
  });

  describe('variant="row"', () => {
    it('renders "Pay with" label on the left and token symbol on the right', () => {
      renderWithProvider(<PredictPayWithRow variant="row" />);

      expect(screen.getByText('Pay with')).toBeOnTheScreen();
      expect(screen.getByText(/USDC/)).toBeOnTheScreen();
    });

    it('shows Predict balance label when predict balance selected', () => {
      mockIsPredictBalanceSelected = true;
      mockPredictBalance = 150.66;

      renderWithProvider(<PredictPayWithRow variant="row" />);

      expect(screen.getByText('Pay with')).toBeOnTheScreen();
      expect(screen.getByText(/Predict balance/)).toBeOnTheScreen();
    });

    it('always renders ArrowRight chevron in row variant', () => {
      const { toJSON } = renderWithProvider(
        <PredictPayWithRow variant="row" />,
      );
      const tree = JSON.stringify(toJSON());

      expect(tree).toContain('ArrowRight');
      expect(tree).not.toContain('ArrowDown');
    });

    it('shows payToken symbol when not predict balance', () => {
      mockIsPredictBalanceSelected = false;
      mockPayToken = {
        symbol: 'USDC',
        address: '0xToken',
        chainId: '0x89',
        balanceFiat: '$200.50',
      } as typeof mockPayToken;

      renderWithProvider(<PredictPayWithRow variant="row" />);

      expect(screen.getByText(/USDC/)).toBeOnTheScreen();
    });

    it('navigates to pay-with modal on press', () => {
      renderWithProvider(<PredictPayWithRow variant="row" />);

      fireEvent.press(screen.getByText('Pay with'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.CONFIRMATION_PAY_WITH_MODAL,
      );
    });

    it('does not navigate when disabled', () => {
      renderWithProvider(<PredictPayWithRow variant="row" disabled />);

      fireEvent.press(screen.getByText('Pay with'));

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('displays available balance in parentheses when provided', () => {
      renderWithProvider(
        <PredictPayWithRow variant="row" availableBalance="$12.34" />,
      );

      expect(screen.getByText('($12.34)')).toBeOnTheScreen();
    });

    it('does not display balance parentheses when availableBalance is not provided', () => {
      renderWithProvider(<PredictPayWithRow variant="row" />);

      expect(screen.queryByText(/\(\$/)).toBeNull();
    });
  });
});
