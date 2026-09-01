import {
  getConversationMessageEntries,
  getUniqueTokenSymbols,
} from './performanceUtils';

describe('Wallet Assistant performance utilities', () => {
  it('resolves each normalized token symbol once per response', () => {
    expect(getUniqueTokenSymbols([' eth ', 'ETH', 'usdc', '', 'UsDc'])).toEqual(
      ['ETH', 'USDC'],
    );
  });

  it('associates assistant responses with the nearest preceding user prompt', () => {
    const messages = [
      { id: 'user-1', role: 'user' as const, text: 'Research ETH' },
      { id: 'assistant-1', role: 'assistant' as const, text: 'First response' },
      { id: 'assistant-2', role: 'assistant' as const, text: 'Follow-up' },
      { id: 'user-2', role: 'user' as const, text: 'Buy USDC' },
      { id: 'assistant-3', role: 'assistant' as const, text: 'Trade response' },
    ];

    expect(
      getConversationMessageEntries(messages).map(
        ({ message, previousUserPrompt }) => ({
          id: message.id,
          previousUserPrompt,
        }),
      ),
    ).toEqual([
      { id: 'user-1', previousUserPrompt: '' },
      { id: 'assistant-1', previousUserPrompt: 'Research ETH' },
      { id: 'assistant-2', previousUserPrompt: 'Research ETH' },
      { id: 'user-2', previousUserPrompt: 'Research ETH' },
      { id: 'assistant-3', previousUserPrompt: 'Buy USDC' },
    ]);
  });
});
