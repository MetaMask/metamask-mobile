import type {
  CardSpendingPrerequisite,
  CardSmartContractWriteParams,
  CardKycCtaHint,
} from '../../../../core/Engine/controllers/card-controller/provider-types';

export type ImmersveNextAction =
  | { type: 'contact'; needsEmail: boolean; needsPhone: boolean }
  | {
      type: 'kyc';
      url?: string;
      ctaHint?: CardKycCtaHint;
      reasons?: string[];
    }
  | { type: 'expected_spend' }
  | { type: 'funding'; write: CardSmartContractWriteParams }
  | {
      type: 'rejected';
      /** False for `blocked`, and for `kyc_check_failed` when Immersve sent no new link. */
      canRetry: boolean;
      retryUrl?: string;
      reasons?: string[];
    }
  | { type: 'pending' }
  | { type: 'active' };

const findActionRequired = (
  prerequisites: CardSpendingPrerequisite[],
  actionType: string,
): CardSpendingPrerequisite | undefined =>
  prerequisites.find(
    (p) => p.status === 'action-required' && p.actionType === actionType,
  );

const readKycUrl = (
  prerequisite: CardSpendingPrerequisite | undefined,
): string | undefined => {
  const url = (prerequisite?.params as { kycUrl?: unknown } | undefined)
    ?.kycUrl;
  return typeof url === 'string' && url.length > 0 ? url : undefined;
};

const readCtaHint = (
  prerequisite: CardSpendingPrerequisite,
): CardKycCtaHint | undefined =>
  prerequisite.ctaHint ??
  (prerequisite.params as { ctaHint?: CardKycCtaHint } | undefined)?.ctaHint;

/** Reason codes only. Immersve's descriptions are English and aimed at partners. */
const readReasonCodes = (
  prerequisite: CardSpendingPrerequisite | undefined,
): string[] => {
  const reasons = (prerequisite?.params as { reasons?: unknown } | undefined)
    ?.reasons;
  if (!Array.isArray(reasons)) {
    return [];
  }

  const codes: string[] = [];
  for (const reason of reasons) {
    if (typeof reason === 'string' && reason.length > 0) {
      codes.push(reason);
      continue;
    }
    if (reason && typeof reason === 'object' && 'code' in reason) {
      const code = (reason as { code?: unknown }).code;
      if (typeof code === 'string' && code.length > 0) {
        codes.push(code);
      }
    }
  }
  return codes;
};

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

  // A failed check can arrive together with a fresh follow_kyc_url. That is
  // still a rejection; the link only means Immersve will allow another try.
  // `blocked` never retries, even if a link is present.
  const rejected = prerequisites.find(
    (p) => p.status === 'blocked' || p.status === 'kyc_check_failed',
  );
  if (rejected) {
    const followUp = findActionRequired(prerequisites, 'follow_kyc_url');
    const retryUrl =
      readKycUrl(rejected) ??
      (rejected.status === 'kyc_check_failed'
        ? readKycUrl(followUp)
        : undefined);
    const reasons = readReasonCodes(rejected);
    return {
      type: 'rejected',
      canRetry: rejected.status !== 'blocked' && Boolean(retryUrl),
      retryUrl,
      reasons: reasons.length > 0 ? reasons : readReasonCodes(followUp),
    };
  }

  const kyc = findActionRequired(prerequisites, 'follow_kyc_url');
  if (kyc) {
    return {
      type: 'kyc',
      url: readKycUrl(kyc),
      ctaHint: readCtaHint(kyc),
      reasons: readReasonCodes(kyc),
    };
  }

  if (findActionRequired(prerequisites, 'set_expected_spend_amount')) {
    return { type: 'expected_spend' };
  }

  const identityPending = prerequisites.some(
    (p) => (p.stage === 'kyc' || p.stage === 'aml') && p.status !== 'ok',
  );
  if (identityPending) {
    return { type: 'pending' };
  }

  const funding = findActionRequired(prerequisites, 'smart_contract_write');
  if (funding) {
    return {
      type: 'funding',
      write: funding.params as unknown as CardSmartContractWriteParams,
    };
  }

  const anyOutstanding = prerequisites.some((p) => p.status !== 'ok');
  return anyOutstanding ? { type: 'pending' } : { type: 'active' };
}
