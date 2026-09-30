import { act } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import { createCollectorCryptError } from '../services/errors';
import {
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
  renderHookWithQueryClient,
} from '../../../views/testUtils';
import { showErrorToast, showSuccessToast } from '../../../hooks/toasts';
import { useSellCard } from './useSellCard';

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      GachaController: { sellCard: jest.fn() },
      AssetsController: { getAssets: jest.fn() },
    },
  },
}));

jest.mock('../../../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual(
    '../../../../../../selectors/multichainAccounts/accounts',
  ),
  selectSelectedInternalAccountByScope: jest.fn(),
}));

jest.mock('../../../hooks/toasts', () => ({
  showSuccessToast: jest.fn(),
  showErrorToast: jest.fn(),
}));

const controller = jest.mocked(Engine.context.GachaController);
const mockGetAssets = jest.mocked(Engine.context.AssetsController.getAssets);

describe('useSellCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(() => MOCK_INTERNAL_ACCOUNT);
    mockGetAssets.mockResolvedValue({});
  });

  it('sells the card, shows the sold toast and refreshes the balance', async () => {
    const sale = { mint: 'MintA', amount: '42500000', signature: 'sig' };
    controller.sellCard.mockResolvedValue(sale);
    const { result } = renderHookWithQueryClient(() =>
      useSellCard(MOCK_ACCOUNT),
    );

    let returned: Awaited<ReturnType<typeof result.current.sellCard>>;
    await act(async () => {
      returned = await result.current.sellCard('MintA');
    });

    expect(returned).toStrictEqual(sale);
    expect(controller.sellCard).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      mint: 'MintA',
    });
    expect(showSuccessToast).toHaveBeenCalledWith('Sold for 42.50 USDC');
    expect(mockGetAssets).toHaveBeenCalledTimes(1);
    expect(result.current.isSelling).toBe(false);
  });

  it('shows the mapped error and resolves undefined on failure', async () => {
    controller.sellCard.mockRejectedValue(
      createCollectorCryptError({ code: 'BUYBACK_UNAVAILABLE' }),
    );
    const { result } = renderHookWithQueryClient(() =>
      useSellCard(MOCK_ACCOUNT),
    );

    let returned: Awaited<ReturnType<typeof result.current.sellCard>>;
    await act(async () => {
      returned = await result.current.sellCard('MintA');
    });

    expect(returned).toBeUndefined();
    expect(showErrorToast).toHaveBeenCalledWith(
      "The sale didn't go through",
      "This card can't be sold back anymore.",
    );
    expect(mockGetAssets).not.toHaveBeenCalled();
    expect(result.current.isSelling).toBe(false);
  });

  it('reports the sale in progress', async () => {
    let resolveSale: (value: {
      mint: string;
      amount: string;
      signature: string;
    }) => void = () => undefined;
    controller.sellCard.mockReturnValue(
      new Promise((resolve) => {
        resolveSale = resolve;
      }),
    );
    const { result } = renderHookWithQueryClient(() =>
      useSellCard(MOCK_ACCOUNT),
    );

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.sellCard('MintA');
    });

    expect(result.current.isSelling).toBe(true);
    await act(async () => {
      resolveSale({ mint: 'MintA', amount: '1000000', signature: 'sig' });
      await pending;
    });
    expect(result.current.isSelling).toBe(false);
  });

  it('does nothing without an account', async () => {
    const { result } = renderHookWithQueryClient(() => useSellCard(undefined));

    let returned: Awaited<ReturnType<typeof result.current.sellCard>>;
    await act(async () => {
      returned = await result.current.sellCard('MintA');
    });

    expect(returned).toBeUndefined();
    expect(controller.sellCard).not.toHaveBeenCalled();
  });
});
