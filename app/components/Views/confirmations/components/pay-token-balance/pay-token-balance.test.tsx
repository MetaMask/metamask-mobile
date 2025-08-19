import React from 'react';
import { render } from '@testing-library/react-native';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { BridgeToken } from '../../../../UI/Bridge/types';
import { useTransactionPayToken } from '../../hooks/pay/useTransactionPayToken';
import { PayTokenBalance } from './pay-token-balance';
import { View as MockView } from 'react-native';

jest.mock('../../hooks/pay/useTransactionPayToken');
jest.mock('../../../../UI/Bridge/hooks/useTokensWithBalance');

jest.mock('../../../../UI/AnimatedSpinner', () => ({
  __esModule: true,
  ...jest.requireActual('../../../../UI/AnimatedSpinner'),
  default: () => <MockView testID="pay-token-spinner">{`Spinner`}</MockView>,
}));

const TOKEN_ADDRESS_MOCK = '0xabcd1234abcd1234abcd1234abcd1234abcd1234';
const CHAIN_ID_MOCK = '0x123';
const BALANCE_FIAT_MOCK = '$100.12';

describe('PayTokenBalance', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTokensWithBalanceMock = jest.mocked(useTokensWithBalance);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionPayTokenMock.mockReturnValue({
      balanceFiat: BALANCE_FIAT_MOCK,
      balanceHuman: '1.23',
      decimals: 4,
      payToken: {
        address: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
      },
      setPayToken: jest.fn(),
    });

    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
        balanceFiat: BALANCE_FIAT_MOCK,
      },
    ] as unknown as BridgeToken[]);
  });

  it('renders pay token balance', () => {
    const { getByText } = render(<PayTokenBalance />);
    expect(getByText(`Available: ${BALANCE_FIAT_MOCK}`)).toBeDefined();
  });

  it('renders spinner if no pay token selected', () => {
    useTransactionPayTokenMock.mockReturnValue({
      payToken: undefined,
    } as ReturnType<typeof useTransactionPayToken>);

    const { getByTestId } = render(<PayTokenBalance />);
    expect(getByTestId('pay-token-spinner')).toBeDefined();
  });

  it('renders spinner if token not found', () => {
    useTokensWithBalanceMock.mockReturnValue([]);

    const { getByTestId } = render(<PayTokenBalance />);
    expect(getByTestId('pay-token-spinner')).toBeDefined();
  });
});
