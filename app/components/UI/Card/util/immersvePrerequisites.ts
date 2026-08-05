import type {
  CardSpendingPrerequisite,
  CardSmartContractWriteParams,
  CardKycCtaHint,
} from '../../../../core/Engine/controllers/card-controller/provider-types';

export type ImmersveNextAction =
  | { type: 'contact'; needsEmail: boolean; needsPhone: boolean }
  | { type: 'kyc'; url?: string; ctaHint?: CardKycCtaHint }
  | { type: 'expected_spend' }
  | { type: 'funding'; write: CardSmartContractWriteParams }
  | { type: 'rejected'; retryUrl?: string }
  | { type: 'pending' }
  | { type: 'active' };

const findActionRequired = (
  prerequisites: CardSpendingPrerequisite[],
  actionType: string,
): CardSpendingPrerequisite | undefined =>
  prerequisites.find(
    (p) => p.status === 'action-required' && p.actionType === actionType,
  );

export function deriveNextImmersveAction(
  prerequisites: CardSpendingPrerequisite[],
): ImmersveNextAction {
  const email = findActionRequired(prerequisites, 'submit_contact_email');
  const phone = findActionRequired(prerequisites, 'submit_contact_phone');
  if (email || phone) {
    return {
      type: 'contact',
      needsEmail: Boolean(email),
      needsPhone: Boolean(phone),
    };
  }

  const kyc = findActionRequired(prerequisites, 'follow_kyc_url');
  if (kyc) {
    const url = (kyc.params as { kycUrl?: string } | undefined)?.kycUrl;
    const ctaHint =
      kyc.ctaHint ??
      (kyc.params as { ctaHint?: CardKycCtaHint } | undefined)?.ctaHint;

    return { type: 'kyc', url, ctaHint };
  }

  if (findActionRequired(prerequisites, 'set_expected_spend_amount')) {
    return { type: 'expected_spend' };
  }

  const funding = findActionRequired(prerequisites, 'smart_contract_write');
  if (funding) {
    return {
      type: 'funding',
      write: funding.params as unknown as CardSmartContractWriteParams,
    };
  }

  const rejected = prerequisites.find(
    (p) => p.status === 'blocked' || p.status === 'kyc_check_failed',
  );
  if (rejected) {
    const retryUrl = (rejected.params as { kycUrl?: string } | undefined)
      ?.kycUrl;
    return { type: 'rejected', retryUrl };
  }

  const anyOutstanding = prerequisites.some((p) => p.status !== 'ok');
  return anyOutstanding ? { type: 'pending' } : { type: 'active' };
}
