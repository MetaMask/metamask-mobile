import { Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { POLYGON_USDCE } from '../../constants/predict';

export interface WithdrawalToken {
  address: Hex;
  chainId: Hex;
  symbol?: string;
  decimals?: number;
  name?: string;
}

/** Default withdrawal token: Polygon USDC.E */
const DEFAULT_WITHDRAWAL_TOKEN: WithdrawalToken = {
  address: POLYGON_USDCE.address,
  chainId: CHAIN_IDS.POLYGON,
  symbol: POLYGON_USDCE.symbol,
  decimals: POLYGON_USDCE.decimals,
  name: POLYGON_USDCE.name,
};

type Listener = () => void;

/**
 * Simple store for withdrawal token selection.
 * This is needed because the PayWithModal is in a separate navigation screen
 * and doesn't share the ConfirmationContext with the main confirmation view.
 */
class WithdrawalTokenStore {
  private token: WithdrawalToken = DEFAULT_WITHDRAWAL_TOKEN;
  private listeners: Set<Listener> = new Set();

  getToken(): WithdrawalToken {
    return this.token;
  }

  setToken(token: WithdrawalToken): void {
    this.token = token;
    this.notifyListeners();
  }

  reset(): void {
    this.token = DEFAULT_WITHDRAWAL_TOKEN;
    this.notifyListeners();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const withdrawalTokenStore = new WithdrawalTokenStore();
