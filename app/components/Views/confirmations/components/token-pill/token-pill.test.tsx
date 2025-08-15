import React from 'react';
import { TokenPill, TokenPillProps } from './token-pill';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';

jest.mock('../../../../UI/Bridge/hooks/useTokensWithBalance');

const ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678' as Hex;
const CHAIN_ID_MOCK = '0x123';
const SYMBOL_MOCK = 'TST';

const STATE_MOCK = {
  engine: {
    backgroundState,
  },
};

function render(props: TokenPillProps) {
  return renderWithProvider(<TokenPill {...props} />, {
    state: STATE_MOCK,
  });
}

describe('TokenPill', () => {
  const useTokensWithBalanceMock = jest.mocked(useTokensWithBalance);

  beforeEach(() => {
    jest.resetAllMocks();

    useTokensWithBalanceMock.mockReturnValue([
      {
        address: ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
        symbol: SYMBOL_MOCK,
        decimals: 18,
      },
    ]);
  });

  it('renders token symbol', () => {
    const { getByTestId } = render({
      address: ADDRESS_MOCK,
      chainId: CHAIN_ID_MOCK,
    });

    expect(getByTestId('token-pill-symbol')).toHaveTextContent(SYMBOL_MOCK);
  });

  it('finds token using case-insensitive address', () => {
    const { getByTestId } = render({
      address: ADDRESS_MOCK.toUpperCase() as Hex,
      chainId: CHAIN_ID_MOCK,
    });

    expect(getByTestId('token-pill-symbol')).toHaveTextContent(SYMBOL_MOCK);
  });

  it('renders token icon', () => {
    const { getByTestId } = render({
      address: ADDRESS_MOCK,
      chainId: CHAIN_ID_MOCK,
    });

    expect(getByTestId('token-pill-icon')).toHaveTextContent('T');
  });

  it('renders nothing if token not found', () => {
    const { queryByTestId } = render({
      address: '0x123',
      chainId: CHAIN_ID_MOCK,
    });

    expect(queryByTestId('token-pill-symbol')).toBeNull();
  });

  it('renders arrow if showArrow is true', () => {
    const { getByTestId } = render({
      address: ADDRESS_MOCK,
      chainId: CHAIN_ID_MOCK,
      showArrow: true,
    });

    expect(getByTestId('token-pill-arrow')).toBeDefined();
  });
});
