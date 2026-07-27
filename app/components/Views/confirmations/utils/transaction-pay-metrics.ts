const PAYMENT_METHOD_ALIASES: Record<string, string> = {
  apple_pay: 'apple_pay',
  'apple-pay': 'apple_pay',
  bank_transfer: 'bank_transfer',
  'bank-transfer': 'bank_transfer',
  crypto: 'crypto',
  debit_credit_card: 'debit_credit_card',
  'debit-credit-card': 'debit_credit_card',
  google_pay: 'google_pay',
  'google-pay': 'google_pay',
  instant_bank_transfer: 'bank_transfer',
  'instant-bank-transfer': 'bank_transfer',
  rev_pay: 'rev_pay',
  'rev-pay': 'rev_pay',
  revolut_pay: 'rev_pay',
  'revolut-pay': 'rev_pay',
  sepa_bank_transfer: 'bank_transfer',
  'sepa-bank-transfer': 'bank_transfer',
};

export function normalizeMetaMaskPayPaymentMethod(
  paymentMethod: string | undefined,
): string | undefined {
  if (!paymentMethod) {
    return undefined;
  }

  const raw = getPaymentMethodCode(paymentMethod).toLowerCase();

  return PAYMENT_METHOD_ALIASES[raw] ?? raw.replace(/-/gu, '_');
}

export function getMetaMaskPayFiatChainTarget({
  caipAssetId,
  chainId,
}: {
  caipAssetId?: string;
  chainId?: string;
}): string | undefined {
  return (
    getHexChainId(chainId) ?? getHexChainId(getCaipAssetChainId(caipAssetId))
  );
}

function getPaymentMethodCode(paymentMethod: string): string {
  const parts = paymentMethod.split('/').filter(Boolean);

  return parts[parts.length - 1] ?? paymentMethod;
}

function getCaipAssetChainId(
  caipAssetId: string | undefined,
): string | undefined {
  return caipAssetId?.split('/')[0];
}

function getHexChainId(chainId: string | undefined): string | undefined {
  if (!chainId) {
    return undefined;
  }

  if (/^0x[0-9a-f]+$/iu.test(chainId)) {
    return chainId.toLowerCase();
  }

  const decimalChainId = getDecimalChainId(chainId);

  if (!decimalChainId) {
    return undefined;
  }

  return `0x${BigInt(decimalChainId).toString(16)}`;
}

function getDecimalChainId(chainId: string): string | undefined {
  const caipMatch = /^eip155:(\d+)$/u.exec(chainId);

  if (caipMatch?.[1]) {
    return caipMatch[1];
  }

  return /^\d+$/u.test(chainId) ? chainId : undefined;
}
