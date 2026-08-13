import type { Hex } from '@metamask/utils';
import type { MoneyAccountWalletRegistrationResult } from '@metamask/ramps-controller';
import Engine from '../../../../../core/Engine';
import {
  abbreviate,
  describeError,
  traceWhilePending,
  vbaTrace,
} from '../../debug/vbaTrace';
import {
  DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN,
  MONEY_ACCOUNT_WALLET_REGISTRATION_BLOCKCHAIN,
} from './constants';

/**
 * Chain recorded by `RampsController.registerMoneyAccountWallet` / neobank-proxy.
 * Re-exported under the historical name used by callers and tests.
 */
export const MONEY_ACCOUNT_WALLET_REGISTRATION_CHAIN =
  MONEY_ACCOUNT_WALLET_REGISTRATION_BLOCKCHAIN;

export interface RegisterSelectedMoneyAccountWalletParams {
  /**
   * Trace `source` label, e.g. `pipeline` or `kycCompletion`.
   */
  source: string;
  /**
   * Address to register. Defaults to the currently selected account.
   */
  address?: string;
}

export interface RegisterSelectedMoneyAccountWalletResult {
  address: string;
  registrationChain: typeof MONEY_ACCOUNT_WALLET_REGISTRATION_CHAIN;
  resultType: MoneyAccountWalletRegistrationResult['type'];
  /**
   * True when this call reused a prior completed session result or joined an
   * in-flight registration for the same address, so no second signing prompt
   * was started from this helper.
   */
  reused: boolean;
  registrationId?: string;
}

interface CachedRegistration {
  address: string;
  resultType: MoneyAccountWalletRegistrationResult['type'];
  registrationId?: string;
}

const completedByAddress = new Map<string, CachedRegistration>();
const inFlightByAddress = new Map<string, Promise<CachedRegistration>>();

const asError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

/**
 * Resolves the address that will be registered, preferring an explicit
 * override so the autoramp pipeline can lock to the same recipient it uses
 * for `createAutoramp`.
 *
 * @param address - Optional address override.
 * @returns The address to register.
 */
function resolveRegistrationAddress(address?: string): string {
  if (address) {
    return address;
  }

  const selectedAccount =
    Engine.context.AccountsController.getSelectedAccount();
  const selectedAddress = selectedAccount?.address as Hex | undefined;
  if (!selectedAddress) {
    throw new Error('No wallet address is selected.');
  }
  return selectedAddress;
}

/**
 * Registers the selected (or supplied) Money Account wallet via the existing
 * `RampsController.registerMoneyAccountWallet` path: Iron customer resolution,
 * self-hosted lookup, EIP-191 `personal_sign`, then neobank-proxy submit.
 *
 * Session-scoped: a successful registration for an address is reused, and
 * concurrent callers for the same address await the same in-flight promise so
 * KYC-completion and the visible pipeline cannot both open a signing prompt.
 *
 * Limitation: the controller hardcodes blockchain `Monad`. Keep the demo
 * autoramp destination on the same chain so MoonPay accepts the recipient.
 *
 * @param params - Source label and optional address override.
 * @returns Registration outcome metadata safe for UI/trace use.
 */
export async function registerSelectedMoneyAccountWallet(
  params: RegisterSelectedMoneyAccountWalletParams,
): Promise<RegisterSelectedMoneyAccountWalletResult> {
  const address = resolveRegistrationAddress(params.address);
  const addressKey = address.toLowerCase();

  const toPublicResult = (
    cached: CachedRegistration,
    reused: boolean,
  ): RegisterSelectedMoneyAccountWalletResult => ({
    address: cached.address,
    registrationChain: MONEY_ACCOUNT_WALLET_REGISTRATION_CHAIN,
    resultType: cached.resultType,
    reused,
    registrationId: cached.registrationId,
  });

  const chainContext = {
    registrationChain: MONEY_ACCOUNT_WALLET_REGISTRATION_CHAIN,
    autorampDestinationBlockchain: DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN,
  };

  const completed = completedByAddress.get(addressKey);
  if (completed) {
    vbaTrace('wallet.register.start', {
      source: params.source,
      address: abbreviate(address),
      ...chainContext,
      reused: true,
      reuseReason: 'sessionCompleted',
      signing: 'KeyringController:signPersonalMessage via RampsController',
    });
    vbaTrace('wallet.register.success', {
      source: params.source,
      address: abbreviate(address),
      ...chainContext,
      reused: true,
      reuseReason: 'sessionCompleted',
      resultType: completed.resultType,
      registrationId: completed.registrationId,
      durationMs: 0,
    });
    return toPublicResult(completed, true);
  }

  const inFlight = inFlightByAddress.get(addressKey);
  if (inFlight) {
    vbaTrace('wallet.register.start', {
      source: params.source,
      address: abbreviate(address),
      ...chainContext,
      reused: true,
      reuseReason: 'inFlight',
      signing: 'KeyringController:signPersonalMessage via RampsController',
    });
    const startedAt = Date.now();
    try {
      const joined = await inFlight;
      vbaTrace('wallet.register.success', {
        source: params.source,
        address: abbreviate(address),
        ...chainContext,
        reused: true,
        reuseReason: 'inFlight',
        resultType: joined.resultType,
        registrationId: joined.registrationId,
        durationMs: Date.now() - startedAt,
      });
      return toPublicResult(joined, true);
    } catch (error) {
      vbaTrace('wallet.register.failed', {
        source: params.source,
        address: abbreviate(address),
        ...chainContext,
        reused: true,
        reuseReason: 'inFlight',
        durationMs: Date.now() - startedAt,
        error: describeError(error),
      });
      throw asError(error);
    }
  }

  const startedAt = Date.now();
  vbaTrace('wallet.register.start', {
    source: params.source,
    address: abbreviate(address),
    ...chainContext,
    reused: false,
    signing: 'KeyringController:signPersonalMessage via RampsController',
    chainLimitation:
      'registerMoneyAccountWallet hardcodes MoonPay blockchain=Monad; autoramp destination is also Monad',
  });
  const stopPendingReports = traceWhilePending('wallet.register.pending', {
    source: params.source,
    address: abbreviate(address),
    ...chainContext,
  });

  const work = (async (): Promise<CachedRegistration> => {
    const result =
      await Engine.context.RampsController.registerMoneyAccountWallet({
        address,
      });
    const cached: CachedRegistration = {
      address,
      resultType: result.type,
      registrationId: result.registration?.id,
    };
    completedByAddress.set(addressKey, cached);
    return cached;
  })();

  inFlightByAddress.set(addressKey, work);

  try {
    const cached = await work;
    vbaTrace('wallet.register.success', {
      source: params.source,
      address: abbreviate(address),
      ...chainContext,
      reused: false,
      // Controller may still skip signing when Iron already has an active
      // Monad registration for this address (`alreadyRegistered`).
      resultType: cached.resultType,
      registrationId: cached.registrationId,
      durationMs: Date.now() - startedAt,
    });
    return toPublicResult(cached, false);
  } catch (error) {
    vbaTrace('wallet.register.failed', {
      source: params.source,
      address: abbreviate(address),
      ...chainContext,
      reused: false,
      durationMs: Date.now() - startedAt,
      error: describeError(error),
    });
    throw asError(error);
  } finally {
    stopPendingReports();
    inFlightByAddress.delete(addressKey);
  }
}

/**
 * Clears session registration cache. Exported for unit tests only.
 */
export function __resetRegisterSelectedMoneyAccountWalletForTests(): void {
  completedByAddress.clear();
  inFlightByAddress.clear();
}
