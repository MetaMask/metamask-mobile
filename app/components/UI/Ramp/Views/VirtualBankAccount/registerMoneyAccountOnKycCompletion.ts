import type { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { buildMoneyAccountAutorampParams } from './moneyAccountAutoramp';

/**
 * Payload published by `KycController:statusChanged`.
 */
type KycStatusChangedPayload = {
  status: string;
  sumsubSessionId: string | null;
  errorCode: string | null;
};

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
 *   overlapping `completed` events are collapsed so registration never runs
 *   twice concurrently. A rejected registration is retried on a later event.
 * - Soft-failing: verification already succeeded, so neither a registration nor
 *   an autoramp error is surfaced to the user — they are logged, and the manual
 *   "Create my account" button on the success screen stays as the fallback.
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

    const address = Engine.context.AccountsController.getSelectedAccount()
      ?.address as Hex | undefined;

    if (!address) {
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

    try {
      await Engine.context.RampsController.registerMoneyAccountWallet({
        address,
      });
      registeredAddresses.add(addressKey);
    } catch (error) {
      Logger.error(asError(error), {
        message: 'Money Account wallet registration failed after KYC completed',
      });
      return;
    } finally {
      inFlightAddresses.delete(addressKey);
    }

    try {
      await Engine.context.RampsController.createAutoramp(
        buildMoneyAccountAutorampParams(address),
      );
    } catch (error) {
      Logger.error(asError(error), {
        message:
          'Autoramp creation failed after Money Account wallet registration',
      });
    }
  };
}
