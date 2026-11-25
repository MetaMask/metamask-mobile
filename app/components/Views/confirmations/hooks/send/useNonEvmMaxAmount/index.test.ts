import BN from 'bnjs4';

import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { evmSendStateMock, SOLANA_ASSET } from '../../../__mocks__/send.mock';
import { useSendContext } from '../../../context/send-context';
import { useBalance } from '../useBalance';
import { useNonEvmMaxAmount } from '.';
// eslint-disable-next-line import-x/no-namespace
import * as TronGetter from './getTronMaxSendableAmountWithFallback';

const TRON_ACCOUNT = {
  id: 'tron-account-id',
  address: 'TK3xRFq22eEiATz6kfamDeAAQrPdfdGPeq',
  metadata: { snap: { id: 'npm:@metamask/tron-wallet-snap' } },
};

const TRON_ASSET = {
  assetId: 'tron:728126428/slip44:195',
  chainId: 'tron:728126428',
  address: 'TK3xRFq22eEiATz6kfamDeAAQrPdfdGPeq',
  decimals: 6,
  isNative: true,
  symbol: 'TRX',
};

jest.mock('@metamask/assets-controllers', () => ({
  getNativeTokenAddress: () => '0xeDd1935e28b253C7905Cf5a944f0B5830FFA916a',
}));

jest.mock('../../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('../useBalance', () => ({
  useBalance: jest.fn(),
}));

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(() => undefined),
}));

jest.mock('./getTronMaxSendableAmountWithFallback', () => ({
  getTronMaxSendableAmountWithFallback: jest.fn(),
}));

const mockState = {
  state: evmSendStateMock,
};

const mockUseSendContext = jest.mocked(useSendContext);
const mockUseBalance = jest.mocked(useBalance);
const mockGetTronMaxSendableAmountWithFallback = jest.mocked(
  TronGetter.getTronMaxSendableAmountWithFallback,
);

const setBalance = (rawBalance: string) => {
  mockUseBalance.mockReturnValue({
    balance: rawBalance,
    decimals: 6,
    rawBalanceBN: new BN(rawBalance),
  });
};

describe('useNonEvmMaxAmount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTronMaxSendableAmountWithFallback.mockResolvedValue({
      amount: '9.5',
    });
  });

  it('routes a Tron asset to the Tron getter', async () => {
    mockUseSendContext.mockReturnValue({
      asset: TRON_ASSET,
      fromAccount: TRON_ACCOUNT,
    } as unknown as ReturnType<typeof useSendContext>);
    setBalance('10000000');

    const { result } = renderHookWithProvider(
      () => useNonEvmMaxAmount(),
      mockState,
    );

    expect(result.current.isNonEvmMaxSupported).toBe(true);
    await expect(result.current.getNonEvmMaxAmount()).resolves.toBe('9.5');
    expect(mockGetTronMaxSendableAmountWithFallback).toHaveBeenCalledWith({
      fromAccount: TRON_ACCOUNT,
      assetId: TRON_ASSET.assetId,
      toAddress: undefined,
      balance: {
        rawBalanceBN: new BN('10000000'),
        decimals: TRON_ASSET.decimals,
        isNative: true,
      },
    });
  });

  it('forwards a known recipient to the getter', async () => {
    mockUseSendContext.mockReturnValue({
      asset: TRON_ASSET,
      fromAccount: TRON_ACCOUNT,
      to: 'TK3xRFq22eEiATz6kfamDeAAQrPdfdGPeq',
    } as unknown as ReturnType<typeof useSendContext>);
    setBalance('10000000');

    const { result } = renderHookWithProvider(
      () => useNonEvmMaxAmount(),
      mockState,
    );

    await result.current.getNonEvmMaxAmount();

    expect(mockGetTronMaxSendableAmountWithFallback).toHaveBeenCalledWith(
      expect.objectContaining({
        toAddress: 'TK3xRFq22eEiATz6kfamDeAAQrPdfdGPeq',
      }),
    );
  });

  it('has no quote without a sender', async () => {
    mockUseSendContext.mockReturnValue({
      asset: TRON_ASSET,
    } as unknown as ReturnType<typeof useSendContext>);
    setBalance('10000000');

    const { result } = renderHookWithProvider(
      () => useNonEvmMaxAmount(),
      mockState,
    );

    await expect(result.current.getNonEvmMaxAmount()).resolves.toBeUndefined();
    expect(mockGetTronMaxSendableAmountWithFallback).not.toHaveBeenCalled();
  });

  it('has no quote for a network without a getter', async () => {
    mockUseSendContext.mockReturnValue({
      asset: SOLANA_ASSET,
    } as unknown as ReturnType<typeof useSendContext>);
    setBalance('10');

    const { result } = renderHookWithProvider(
      () => useNonEvmMaxAmount(),
      mockState,
    );

    expect(result.current.isNonEvmMaxSupported).toBe(false);
    await expect(result.current.getNonEvmMaxAmount()).resolves.toBeUndefined();
    expect(mockGetTronMaxSendableAmountWithFallback).not.toHaveBeenCalled();
  });
});
