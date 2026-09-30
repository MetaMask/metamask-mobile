import { act, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import { createCollectorCryptError } from '../services/errors';
import {
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
  createCard,
  createTestState,
  renderHookWithQueryClient,
} from '../../../views/testUtils';
import { useCollectorCryptCards } from './useCollectorCryptCards';

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      GachaController: {
        syncCards: jest.fn(),
        recoverOperations: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual(
    '../../../../../../selectors/multichainAccounts/accounts',
  ),
  selectSelectedInternalAccountByScope: jest.fn(),
}));

const controller = jest.mocked(Engine.context.GachaController);
const mockAccountByScope = jest.fn();

const OLD_CARD = createCard({ mint: 'MintOld', acquiredAt: 1 });
const NEW_CARD = createCard({ mint: 'MintNew', acquiredAt: 2 });

describe('useCollectorCryptCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(selectSelectedInternalAccountByScope)
      .mockReturnValue(mockAccountByScope);
    mockAccountByScope.mockReturnValue(MOCK_INTERNAL_ACCOUNT);
    controller.syncCards.mockResolvedValue([]);
    controller.recoverOperations.mockResolvedValue(undefined);
  });

  it('returns the cached cards of the selected account, newest first', async () => {
    const { result } = renderHookWithQueryClient(
      () => useCollectorCryptCards(),
      { state: createTestState({ cards: [OLD_CARD, NEW_CARD] }) },
    );

    await waitFor(() => expect(result.current.isSyncing).toBe(false));

    expect(result.current.account).toStrictEqual(MOCK_ACCOUNT);
    expect(result.current.cards.map((card) => card.mint)).toStrictEqual([
      'MintNew',
      'MintOld',
    ]);
    expect(result.current.isLoading).toBe(false);
  });

  it('syncs the cards and recovers operations once for the account', async () => {
    const { rerender } = renderHookWithQueryClient(() =>
      useCollectorCryptCards(),
    );

    rerender({});

    await waitFor(() =>
      expect(controller.syncCards).toHaveBeenCalledWith({
        account: MOCK_ACCOUNT,
      }),
    );
    expect(controller.recoverOperations).toHaveBeenCalledTimes(1);
    expect(controller.recoverOperations).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
    });
  });

  it('reports loading while the first sync runs without cached cards', async () => {
    controller.syncCards.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHookWithQueryClient(() =>
      useCollectorCryptCards(),
    );

    await waitFor(() => expect(result.current.isSyncing).toBe(true));
    expect(result.current.isLoading).toBe(true);
  });

  it('keeps cached cards visible and reports the sync error', async () => {
    controller.syncCards.mockRejectedValue(
      createCollectorCryptError({ code: 'NETWORK_ERROR', retryable: true }),
    );

    const { result } = renderHookWithQueryClient(
      () => useCollectorCryptCards(),
      { state: createTestState({ cards: [OLD_CARD] }) },
    );

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.error?.code).toBe('NETWORK_ERROR');
    expect(result.current.cards).toHaveLength(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('runs the sync again on refetch', async () => {
    const { result } = renderHookWithQueryClient(() =>
      useCollectorCryptCards(),
    );
    await waitFor(() => expect(controller.syncCards).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.refetch();
    });

    expect(controller.syncCards).toHaveBeenCalledTimes(2);
  });

  it('does not call the controller when disabled', () => {
    renderHookWithQueryClient(() => useCollectorCryptCards({ enabled: false }));

    expect(controller.syncCards).not.toHaveBeenCalled();
    expect(controller.recoverOperations).not.toHaveBeenCalled();
  });

  it('does not call the controller without a Solana account', () => {
    mockAccountByScope.mockReturnValue(undefined);

    const { result } = renderHookWithQueryClient(() =>
      useCollectorCryptCards(),
    );

    expect(result.current.account).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(controller.syncCards).not.toHaveBeenCalled();
    expect(controller.recoverOperations).not.toHaveBeenCalled();
  });
});
