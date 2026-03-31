interface SendScope {
  isSolanaOnly?: boolean;
  isEvmOnly?: boolean;
  isBIP44?: boolean;
}

export function useSendScope(): SendScope {
  return {
    isBIP44: true,
    isSolanaOnly: false,
    isEvmOnly: false,
  };
}
