import type { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { abbreviate, describeError, vbaTrace } from '../../debug/vbaTrace';
import { buildMoneyAccountAutorampParams } from './moneyAccountAutoramp';
import { ensureMoneyAccountAutorampCreated } from './moneyAccountProvisioning';
import { registerSelectedMoneyAccountWallet } from './registerSelectedMoneyAccountWallet';

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
 * chain KYC `completed` to Money Account wallet registration to autoramp.
 *
 * Wallet registration used to run eagerly right after the SumSub hand-off in
 * `MockKycEmail`; the real signal is the user-keyed status flipping to
 * `completed` (from the KYC status webhook / poll), so registration is deferred
 * to that event here. On successful registration the same autoramp creation the
 * "Create my account" pipeline runs is fired automatically, since the Iron
 * signing webhook that would do this server-side is not ready yet.
 *
 * Registration is shared with the success-screen pipeline via
 * {@link registerSelectedMoneyAccountWallet}, so a completed or in-flight
 * signing for the same address does not open a second prompt. Autoramp
 * creation is shared via {@link ensureMoneyAccountAutorampCreated}.
 *
 * The subscriber is:
 * - Idempotent: registration and autoramp creation each run at most once per
 * address whether the trigger was this event or the success screen. A rejected
 * registration or autoramp is retried on a later event.
 * - Soft-failing: verification already succeeded, so neither a registration nor
 * an autoramp error is surfaced to the user - they are logged, and the manual
 * "Create my account" button on the success screen stays as the fallback.
 *
 * @returns The `KycController:statusChanged` handler.
 */
export function createRegisterMoneyAccountOnKycCompletion(): (
  payload: KycStatusChangedPayload,
) => Promise<void> {
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
      vbaTrace('wallet.register.noAccount', {
        source: 'registerMoneyAccountOnKycCompletion',
      });
      Logger.log(
        'Skipping Money Account wallet registration after KYC: no selected account.',
      );
      return;
    }

    try {
      await registerSelectedMoneyAccountWallet({
        source: 'kycCompletion',
        address,
      });
    } catch (error) {
      Logger.error(asError(error), {
        message: 'Money Account wallet registration failed after KYC completed',
      });
      return;
    }

    try {
      const autorampRequest = buildMoneyAccountAutorampParams(address);
      vbaTrace('autoramp.create.start', {
        route: 'POST /neobank/autoramps',
        source: 'registerMoneyAccountOnKycCompletion',
        request: autorampRequest,
        recipientAddress: abbreviate(address),
      });
      const created = await ensureMoneyAccountAutorampCreated(address);
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
