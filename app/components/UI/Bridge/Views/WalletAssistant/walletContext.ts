import React from 'react';

import type { BridgeToken } from '../../types';

export interface WalletAssistantWalletContextValue {
  activeChainId: string;
  tokensWithBalance: BridgeToken[];
}

export const WalletAssistantWalletContext =
  React.createContext<WalletAssistantWalletContextValue>({
    activeChainId: '',
    tokensWithBalance: [],
  });
