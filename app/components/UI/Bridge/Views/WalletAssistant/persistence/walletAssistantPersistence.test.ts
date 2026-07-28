import StorageWrapper from '../../../../../../store/storage-wrapper';
import {
  clearWalletAssistantState,
  EMPTY_WALLET_ASSISTANT_STATE,
  loadWalletAssistantState,
  MAX_PERSISTED_MESSAGES,
  normalizeWalletAssistantState,
  saveWalletAssistantState,
  WALLET_ASSISTANT_STORAGE_KEY,
  WALLET_ASSISTANT_STORAGE_VERSION,
  WalletAssistantPersistenceState,
} from './walletAssistantPersistence';

jest.mock('../../../../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockedStorageWrapper = jest.mocked(StorageWrapper);

function createState(): WalletAssistantPersistenceState {
  return {
    messages: [
      {
        id: 'user-1',
        role: 'user',
        text: 'Research ETH',
      },
      {
        id: 'assistant-1',
        role: 'assistant',
        text: 'Ethereum overview',
        research: {
          asOf: '2026-07-27T12:00:00Z',
          assets: [
            {
              chainId: 'eip155:1',
              contractAddress: '',
              name: 'Ethereum',
              network: 'Ethereum',
              symbol: 'ETH',
            },
          ],
          chart: {
            labels: ['Mon', 'Tue'],
            sourceIds: ['market-source', 'market-source'],
            title: 'ETH price',
            unit: 'USD',
            values: [1800, 1850],
          },
          sections: [
            {
              heading: 'Market move',
              bullets: ['ETH rose during the session.'],
              evidence: [{ confidence: 'high', sourceIds: ['market-source'] }],
            },
          ],
          sources: [
            {
              date: '2026-07-27',
              id: 'market-source',
              title: 'Market source',
              url: 'https://example.com/ethereum',
            },
          ],
          summary: 'ETH moved higher.',
          title: 'Ethereum update',
          tokens: ['ETH'],
          swapIntent: {
            amountType: 'exact',
            amountValue: '0.1',
            enabled: true,
            mode: 'real',
            network: 'Ethereum',
            sourceAmount: '0.1',
            sourceSymbol: 'USDC',
            destinationSymbol: 'ETH',
          },
        },
      },
    ],
    trackedQuoteRequestId: 'quote-request-1',
  };
}

describe('walletAssistantPersistence', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns an empty state when no conversation is stored', async () => {
    mockedStorageWrapper.getItem.mockResolvedValue(null);

    await expect(loadWalletAssistantState()).resolves.toEqual(
      EMPTY_WALLET_ASSISTANT_STATE,
    );
  });

  it('round trips the supported versioned state', async () => {
    const state = createState();
    mockedStorageWrapper.setItem.mockResolvedValue(undefined);

    await saveWalletAssistantState(state);

    const storedValue = mockedStorageWrapper.setItem.mock.calls[0][1];
    expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
      WALLET_ASSISTANT_STORAGE_KEY,
      expect.any(String),
    );
    expect(JSON.parse(storedValue)).toEqual({
      version: WALLET_ASSISTANT_STORAGE_VERSION,
      ...state,
    });

    mockedStorageWrapper.getItem.mockResolvedValue(storedValue);
    await expect(loadWalletAssistantState()).resolves.toEqual(state);
  });

  it('disables a legacy paper trade instead of reopening it as a real swap', () => {
    const state = createState();
    const assistantMessage = state.messages[1];
    if (!assistantMessage.research) {
      throw new Error('Expected research fixture.');
    }
    (assistantMessage.research.swapIntent as unknown as { mode: string }).mode =
      'paper';

    const normalized = normalizeWalletAssistantState(state);

    expect(normalized.messages[1].research?.swapIntent).toEqual(
      expect.objectContaining({
        enabled: false,
        mode: 'real',
      }),
    );
  });

  it('keeps only the most recent bounded conversation history', async () => {
    const messages = Array.from(
      { length: MAX_PERSISTED_MESSAGES + 5 },
      (_, index) => ({
        id: `message-${index}`,
        role: 'user' as const,
        text: `Message ${index}`,
      }),
    );

    const normalized = normalizeWalletAssistantState({ messages });

    expect(normalized.messages).toHaveLength(MAX_PERSISTED_MESSAGES);
    expect(normalized.messages[0].id).toBe('message-5');
    expect(normalized.messages.at(-1)?.id).toBe(
      `message-${MAX_PERSISTED_MESSAGES + 4}`,
    );
  });

  it('redacts wallet addresses and discards fields outside the schema', async () => {
    const address = '0x1234567890123456789012345678901234567890';
    const stateWithSensitiveFields = {
      messages: [
        {
          id: 'user-1',
          role: 'user',
          text: `Check ${address}`,
          walletSnapshot: { address, balance: '10 ETH' },
        },
      ],
      trackedQuoteRequestId: 'quote-request-1',
      apiKey: 'must-not-be-stored',
      walletSnapshot: { address },
    };
    mockedStorageWrapper.setItem.mockResolvedValue(undefined);

    await saveWalletAssistantState(
      stateWithSensitiveFields as unknown as WalletAssistantPersistenceState,
    );

    const storedValue = mockedStorageWrapper.setItem.mock.calls[0][1];
    expect(storedValue).not.toContain(address);
    expect(storedValue).not.toContain('must-not-be-stored');
    expect(storedValue).not.toContain('walletSnapshot');
    expect(JSON.parse(storedValue)).toEqual({
      version: WALLET_ASSISTANT_STORAGE_VERSION,
      messages: [
        {
          id: 'user-1',
          role: 'user',
          text: 'Check [wallet address]',
        },
      ],
      trackedQuoteRequestId: 'quote-request-1',
    });
  });

  it.each([
    ['malformed JSON', '{'],
    [
      'an unsupported schema version',
      JSON.stringify({
        version: WALLET_ASSISTANT_STORAGE_VERSION + 1,
        messages: createState().messages,
      }),
    ],
    [
      'a malformed state',
      JSON.stringify({
        version: WALLET_ASSISTANT_STORAGE_VERSION,
        messages: 'not-an-array',
      }),
    ],
  ])('fails safely for %s', async (_description, storedValue) => {
    mockedStorageWrapper.getItem.mockResolvedValue(storedValue);

    await expect(loadWalletAssistantState()).resolves.toEqual(
      EMPTY_WALLET_ASSISTANT_STATE,
    );
  });

  it('fails safely when storage cannot be read', async () => {
    mockedStorageWrapper.getItem.mockRejectedValue(new Error('Unavailable'));

    await expect(loadWalletAssistantState()).resolves.toEqual(
      EMPTY_WALLET_ASSISTANT_STATE,
    );
  });

  it('clears only the Wallet Assistant storage key', async () => {
    mockedStorageWrapper.removeItem.mockResolvedValue(undefined);

    await clearWalletAssistantState();

    expect(mockedStorageWrapper.removeItem).toHaveBeenCalledWith(
      WALLET_ASSISTANT_STORAGE_KEY,
    );
  });
});
