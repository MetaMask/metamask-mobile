import { HttpError } from '@metamask/controller-utils';
import Engine from '../../../../../core/Engine';
import { getSessionProfileId } from '../../../../../util/notifications/utils/get-session-profile-id';
import { describeError, vbaTrace } from '../../debug/vbaTrace';

export type VbaKycSkipReason = 'ukyc-completed' | 'neobank-active';

export interface VbaKycSkipEligibility {
  skip: boolean;
  reason: VbaKycSkipReason | null;
  ukycStatus: string | null;
  customerId: string | null;
  customerStatus: string | null;
  externalId: string | null;
}

/**
 * Builds the signing-gate error when neither UKYC completed nor neobank Active.
 *
 * @param eligibility - Result from {@link resolveVbaKycSkipEligibility}.
 * @returns User-facing error text that mentions both checks.
 */
export function formatVbaKycNotVerifiedMessage(
  eligibility: Pick<VbaKycSkipEligibility, 'ukycStatus' | 'customerStatus'>,
): string {
  return `KYC is not verified yet (UKYC status "${eligibility.ukycStatus ?? 'unknown'}", neobank customer status "${eligibility.customerStatus ?? 'none'}"). The wallet can only be registered once UKYC reads completed or the neobank customer status is Active.`;
}

/**
 * Reads the MoonPay customer id out of the neo-bank proxy's passthrough of
 * MoonPay's `Customer` object.
 *
 * @param customer - Parsed proxy response (or unknown failure value).
 * @returns The customer UUID, or `null` when missing/malformed.
 */
export function readCustomerId(customer: unknown): string | null {
  if (customer && typeof customer === 'object') {
    const { id } = customer as { id?: unknown };
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
  }
  return null;
}

/**
 * Reads MoonPay's account state off the same `Customer` object.
 *
 * @param customer - Parsed proxy response (or unknown failure value).
 * @returns The status string, or `null` when missing/malformed.
 */
export function readCustomerStatus(customer: unknown): string | null {
  if (customer && typeof customer === 'object') {
    const { status } = customer as { status?: unknown };
    if (typeof status === 'string' && status.length > 0) {
      return status;
    }
  }
  return null;
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof HttpError && error.httpStatus === 404;
}

/**
 * Decides whether Iron/SumSub can be skipped because the user is already
 * verified via UKYC (`completed`) or a neobank customer with `status: Active`.
 *
 * Network/auth failures on the neobank lookup fail open to "do not skip" so a
 * transient error cannot falsely bypass SumSub. A 404 / missing customer is
 * treated as not eligible on the neobank path.
 *
 * @returns Structured eligibility for `[VBA-TRACE]` and call-site gating.
 */
export async function resolveVbaKycSkipEligibility(): Promise<VbaKycSkipEligibility> {
  let ukycStatus: string | null = null;
  try {
    const result = await Engine.context.KycController.refreshKycStatus();
    ukycStatus = result.status;
  } catch (error) {
    vbaTrace('kyc.eligibility.ukyc.failed', {
      error: describeError(error),
    });
  }

  let externalId: string | null = null;
  let customerId: string | null = null;
  let customerStatus: string | null = null;

  try {
    const profileId = await getSessionProfileId();
    externalId = profileId ?? null;
    if (!externalId) {
      vbaTrace('kyc.eligibility.identity.missing', {});
    } else {
      try {
        const customer =
          await Engine.context.NeoBankService.getCustomerByExternalId(
            externalId,
          );
        customerId = readCustomerId(customer);
        customerStatus = readCustomerStatus(customer);
        vbaTrace('kyc.eligibility.customer.result', {
          route: 'GET /neobank/customers/{externalId}/external',
          externalId,
          customerId,
          customerStatus,
        });
      } catch (error) {
        if (isNotFoundError(error)) {
          vbaTrace('kyc.eligibility.customer.missing', {
            externalId,
            status: 404,
          });
        } else {
          vbaTrace('kyc.eligibility.customer.failed', {
            externalId,
            error: describeError(error),
          });
        }
      }
    }
  } catch (error) {
    vbaTrace('kyc.eligibility.identity.failed', {
      error: describeError(error),
    });
  }

  let skip = false;
  let reason: VbaKycSkipReason | null = null;
  if (ukycStatus === 'completed') {
    skip = true;
    reason = 'ukyc-completed';
  } else if (customerStatus === 'Active') {
    skip = true;
    reason = 'neobank-active';
  }

  const result: VbaKycSkipEligibility = {
    skip,
    reason,
    ukycStatus,
    customerId,
    customerStatus,
    externalId,
  };
  vbaTrace('kyc.eligibility.result', result);
  return result;
}
