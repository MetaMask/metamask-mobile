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

    expect(tree).not.toContain('"backgroundColor":"#b4b4b528"');
  });

  it('does not apply muted background when transactionMeta is null', () => {
    mockTransactionMeta = null;

    const { toJSON } = renderWithProvider(<PredictPayWithRow />);
    const tree = JSON.stringify(toJSON());

    expect(tree).not.toContain('"backgroundColor":"#b4b4b528"');
  });

  it('does not apply muted background for hardware accounts', () => {
    mockIsHardwareAccount.mockReturnValue(true);

    const { toJSON } = renderWithProvider(<PredictPayWithRow />);
    const tree = JSON.stringify(toJSON());

    expect(tree).not.toContain('"backgroundColor":"#b4b4b528"');
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
});
