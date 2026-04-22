export const TOKEN_SELECTOR_BALANCE_LAYOUT_AB_KEY =
  'swapsSWAPS4242AbtestTokenSelectorBalanceLayout';

export enum TokenSelectorBalanceLayoutVariant {
  Control = 'control',
  Treatment = 'treatment',
}

interface TokenSelectorBalanceLayoutConfig {
  showTokenBalanceFirst: boolean;
  removeTickerFromTokenBalance: boolean;
}

export const TOKEN_SELECTOR_BALANCE_LAYOUT_VARIANTS: Record<
  TokenSelectorBalanceLayoutVariant,
  TokenSelectorBalanceLayoutConfig
> = {
  [TokenSelectorBalanceLayoutVariant.Control]: {
    showTokenBalanceFirst: false,
    removeTickerFromTokenBalance: false,
  },
  [TokenSelectorBalanceLayoutVariant.Treatment]: {
    showTokenBalanceFirst: true,
    removeTickerFromTokenBalance: true,
  },
};
