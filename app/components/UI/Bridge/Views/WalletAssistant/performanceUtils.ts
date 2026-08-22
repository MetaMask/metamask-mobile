export interface ConversationMessageLike {
  role: 'assistant' | 'user';
  text: string;
}

export const getConversationMessageEntries = <
  T extends ConversationMessageLike,
>(
  messages: readonly T[],
) => {
  let previousUserPrompt = '';

  return messages.map((message) => {
    const entry = { message, previousUserPrompt };
    if (message.role === 'user') {
      previousUserPrompt = message.text;
    }
    return entry;
  });
};

export const getUniqueTokenSymbols = (symbols: readonly string[]) =>
  Array.from(
    new Set(
      symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean),
    ),
  );
