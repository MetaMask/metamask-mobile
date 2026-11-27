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
  /** `blocked`: final, no retry. A retriable failure arrives as `kyc`. */
  | { type: 'rejected'; reasons?: string[] }
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

  // `blocked` never retries, even if a link is present.
  const blocked = prerequisites.find((p) => p.status === 'blocked');
  if (blocked) {
    return { type: 'rejected', reasons: readReasonCodes(blocked) };
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
