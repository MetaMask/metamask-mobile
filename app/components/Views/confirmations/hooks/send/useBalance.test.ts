import BN from 'bnjs4';

import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { AssetType } from '../../types/token';
import { evmSendStateMock, MOCK_NFT1155 } from '../../__mocks__/send.mock';
import { useSendContext } from '../../context/send-context';
import { useBalance } from './useBalance';

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

const mockState = {
  state: evmSendStateMock,
};

const mockUseSendContext = useSendContext as jest.MockedFunction<
  typeof useSendContext
>;

describe('useBalance', () => {
  it('return default if no asset is passed', () => {
    mockUseSendContext.mockReturnValue({
      asset: undefined,
    } as unknown as ReturnType<typeof useSendContext>);

    const { result } = renderHookWithProvider(() => useBalance(), mockState);

    expect(result.current).toStrictEqual({
      balance: '0',
      decimals: 0,
      rawBalanceBN: new BN('0'),
    });
  });

  it('use asset.balance to get balance of ERC1155 tokens', () => {
    mockUseSendContext.mockReturnValue({
      asset: MOCK_NFT1155,
    } as unknown as ReturnType<typeof useSendContext>);

    const { result } = renderHookWithProvider(() => useBalance(), mockState);

    expect(result.current).toStrictEqual({
      balance: '2',
      decimals: 0,
      rawBalanceBN: new BN(2, 10),
    });
  });

  it('use asset.rawBalance to get balance if available', () => {
    mockUseSendContext.mockReturnValue({
      asset: {
        rawBalance: '0x3635C9ADC5DEA00000',
        decimals: 18,
      } as unknown as AssetType,
    } as unknown as ReturnType<typeof useSendContext>);

    const { result } = renderHookWithProvider(() => useBalance(), mockState);

    expect(result.current).toStrictEqual({
      balance: '1000',
      decimals: 18,
      rawBalanceBN: new BN('3635c9adc5dea00000', 16),
    });
  });
});
