import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { GasFeeTokenListItem } from './gas-fee-token-list-item';
import { useGasFeeToken } from '../../../hooks/gas/useGasFeeToken';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { Hex } from '@metamask/utils';
import { GasFeeToken } from '@metamask/transaction-controller';
import { transferTransactionStateMock } from '../../../__mocks__/transfer-transaction-mock';

jest.mock('../../../hooks/gas/useGasFeeToken');

const mockUseGasFeeToken = useGasFeeToken as jest.MockedFunction<
  typeof useGasFeeToken
>;

const MOCK_TOKEN = {
  symbol: 'TEST',
  amountFiat: '$1,000.00',
  amountFormatted: '1',
  balanceFiat: '2,345.00',
  tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F' as Hex,
} as ReturnType<typeof useGasFeeToken>;

const NATIVE_TOKEN = {
  symbol: 'ETH',
  amountFiat: '$0.04',
  amountFormatted: '0.000066',
  balanceFiat: '537,761.36',
  tokenAddress: NATIVE_TOKEN_ADDRESS as Hex,
} as ReturnType<typeof useGasFeeToken>;

const runSetup = ({
  tokenAddress,
  isSelected = false,
  onClick,
  warning,
  mockGasFeeTokenResponse = undefined,
}: {
  tokenAddress?: Hex;
  isSelected?: boolean;
  onClick?: (token: GasFeeToken) => void;
  warning?: string;
  mockGasFeeTokenResponse?: ReturnType<typeof useGasFeeToken>;
}) => {
  mockUseGasFeeToken.mockReturnValue(
    mockGasFeeTokenResponse as ReturnType<typeof useGasFeeToken>,
  );

  return renderWithProvider(
    <GasFeeTokenListItem
      isSelected={isSelected}
      onClick={onClick}
      tokenAddress={tokenAddress}
      warning={warning}
    />,
    { state: transferTransactionStateMock },
  );
};

describe('GasFeeTokenListItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render if gasFeeToken is undefined', () => {
    const { toJSON } = runSetup({
      tokenAddress: MOCK_TOKEN.tokenAddress,
    });
    expect(toJSON()).toBeNull();
  });

  it('renders fiat amount for a token', () => {
    const { getByTestId } = runSetup({
      tokenAddress: MOCK_TOKEN.tokenAddress,
      mockGasFeeTokenResponse: MOCK_TOKEN,
    });
    expect(
      getByTestId('gas-fee-token-list-item-amount-fiat').props.children,
    ).toContain('$1,000.00');
  });

  it('renders fiat balance for a token', () => {
    const { getByTestId } = runSetup({
      tokenAddress: MOCK_TOKEN.tokenAddress,
      mockGasFeeTokenResponse: MOCK_TOKEN,
    });
    expect(
      getByTestId('gas-fee-token-list-item-balance').props.children,
    ).toContain('Bal: 2,345.00 USD');
  });

  it('renders token amount', () => {
    const { getByTestId } = runSetup({
      tokenAddress: MOCK_TOKEN.tokenAddress,
      mockGasFeeTokenResponse: MOCK_TOKEN,
    });
    expect(
      getByTestId('gas-fee-token-list-item-amount-token').props.children,
    ).toBe('1 TEST');
  });

  it('renders warning indicator if warning is passed', () => {
    const { getByText, getByTestId } = runSetup({
      tokenAddress: MOCK_TOKEN.tokenAddress,
      warning: 'Test Warning',
      mockGasFeeTokenResponse: MOCK_TOKEN,
    });
    expect(getByText('Test Warning')).toBeTruthy();
    expect(
      getByTestId('gas-fee-token-list-item-symbol').props.children,
    ).toContain('TEST');
  });

  describe('with no token address (native token)', () => {
    it('renders fiat amount', () => {
      const { getByTestId } = runSetup({
        tokenAddress: undefined,
        mockGasFeeTokenResponse: NATIVE_TOKEN,
      });
      expect(
        getByTestId('gas-fee-token-list-item-amount-fiat').props.children,
      ).toContain('$0.04');
    });

    it('renders fiat balance', () => {
      const { getByTestId } = runSetup({
        tokenAddress: undefined,
        mockGasFeeTokenResponse: NATIVE_TOKEN,
      });
      expect(
        getByTestId('gas-fee-token-list-item-balance').props.children,
      ).toContain('Bal: 537,761.36 USD');
    });

    it('renders token amount', () => {
      const { getByTestId } = runSetup({
        tokenAddress: undefined,
        mockGasFeeTokenResponse: NATIVE_TOKEN,
      });
      expect(
        getByTestId('gas-fee-token-list-item-amount-token').props.children,
      ).toBe('0.000066 ETH');
    });
  });

  it('calls onClick with gasFeeToken when pressed', () => {
    const onClick = jest.fn();
    const { getByTestId } = runSetup({
      tokenAddress: MOCK_TOKEN.tokenAddress,
      onClick,
      mockGasFeeTokenResponse: MOCK_TOKEN,
    });
    getByTestId(`gas-fee-token-list-item-${MOCK_TOKEN.symbol}`).props.onPress();
    expect(onClick).toHaveBeenCalledWith(MOCK_TOKEN);
  });

  it('shows selected indicator if isSelected', () => {
    const { getByTestId } = runSetup({
      tokenAddress: MOCK_TOKEN.tokenAddress,
      isSelected: true,
      mockGasFeeTokenResponse: MOCK_TOKEN,
    });
    expect(
      getByTestId('gas-fee-token-list-item-selected-indicator'),
    ).toBeTruthy();
  });
});
