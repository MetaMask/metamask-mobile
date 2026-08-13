import type { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import {
  abbreviate,
  describeError,
  traceWhilePending,
  vbaTrace,
} from '../../debug/vbaTrace';
import { buildMoneyAccountAutorampParams } from './moneyAccountAutoramp';

/**
 * Payload published by `KycController:statusChanged`.
 */
interface KycStatusChangedPayload {
  status: string;
  sumsubSessionId: string | null;
  errorCode: string | null;
}

const asError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value));

/**
 * Builds the `KycController:statusChanged` subscriber that drives the demo
 * chain KYC `completed` → Money Account wallet registration → autoramp.
 *
 * Wallet registration used to run eagerly right after the SumSub hand-off in
 * `MockKycEmail`; the real signal is the user-keyed status flipping to
 * `completed` (from the KYC status webhook / poll), so registration is deferred
 * to that event here. On successful registration the same autoramp creation the
 * "Create my account" pipeline runs is fired automatically, since the Iron
 * signing webhook that would do this server-side is not ready yet.
 *
 * The subscriber is:
 * - Idempotent: a given address is registered at most once per session, and
 * overlapping `completed` events are collapsed so registration never runs
 * twice concurrently. A rejected registration is retried on a later event.
 * - Soft-failing: verification already succeeded, so neither a registration nor
 * an autoramp error is surfaced to the user - they are logged, and the manual
 * "Create my account" button on the success screen stays as the fallback.
 *
 * @returns The `KycController:statusChanged` handler.
 */
export function createRegisterMoneyAccountOnKycCompletion(): (
  payload: KycStatusChangedPayload,
) => Promise<void> {
  const registeredAddresses = new Set<string>();
  const inFlightAddresses = new Set<string>();

  return async function handleKycStatusChanged({
    status,
  }: KycStatusChangedPayload): Promise<void> {
    if (status !== 'completed') {
      return;
    }

    const selectedAccount =
      Engine.context.AccountsController.getSelectedAccount();
    const address = selectedAccount?.address as Hex | undefined;

    if (!address) {
      vbaTrace('wallet.register.noAccount', {});
      Logger.log(
        'Skipping Money Account wallet registration after KYC: no selected account.',
      );
      return;
    }

    const addressKey = address.toLowerCase();
    if (
      registeredAddresses.has(addressKey) ||
      inFlightAddresses.has(addressKey)
    ) {
      return;
    }
    inFlightAddresses.add(addressKey);

    const startedAt = Date.now();
    vbaTrace('wallet.register.start', {
      address: abbreviate(address),
      accountId: selectedAccount?.id,
      accountType: selectedAccount?.type,
      accountScopes: selectedAccount?.scopes,
      // Signing (EIP-191 ownership proof) and the registration POST both run
      // inside RampsController; the `neobank.request` records emitted between
      // this line and the outcome below bracket the signing window.
      signing: 'KeyringController:signPersonalMessage via RampsController',
    });
    const stopPendingReports = traceWhilePending('wallet.register.pending', {
      address: abbreviate(address),
    });

    try {
      const result =
        await Engine.context.RampsController.registerMoneyAccountWallet({
          address,
        });
      registeredAddresses.add(addressKey);
      vbaTrace('wallet.register.success', {
        address: abbreviate(address),
        durationMs: Date.now() - startedAt,
        result,
      });
    } catch (error) {
      vbaTrace('wallet.register.failed', {
        address: abbreviate(address),
        durationMs: Date.now() - startedAt,
        error: describeError(error),
      });
      Logger.error(asError(error), {
        message: 'Money Account wallet registration failed after KYC completed',
      });
      return;
    } finally {
      stopPendingReports();
      inFlightAddresses.delete(addressKey);
    }

    try {
      const autorampRequest = buildMoneyAccountAutorampParams(address);
      vbaTrace('autoramp.create.start', {
        route: 'POST /neobank/autoramps',
        source: 'registerMoneyAccountOnKycCompletion',
        request: autorampRequest,
      });
      const created =
        await Engine.context.RampsController.createAutoramp(autorampRequest);
      vbaTrace('autoramp.create.success', {
        autorampId: created.id,
        status: created.status,
        source: 'registerMoneyAccountOnKycCompletion',
      });
    } catch (error) {
      vbaTrace('autoramp.create.failed', {
        source: 'registerMoneyAccountOnKycCompletion',
        error: describeError(error),
        bodySource: 'neobank.response.error',
      });
      Logger.error(asError(error), {
        message:
          'Autoramp creation failed after Money Account wallet registration',
      });
    }
  };
}
