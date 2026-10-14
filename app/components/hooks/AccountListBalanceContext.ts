import { createContext } from 'react';
import type { AccountListBalanceGetter } from './useNonTokenBalance';

export const AccountListBalanceContext = createContext<
  AccountListBalanceGetter | undefined
>(undefined);
