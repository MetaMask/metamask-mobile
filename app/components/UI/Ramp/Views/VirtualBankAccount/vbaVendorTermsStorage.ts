import StorageWrapper from '../../../../../store/storage-wrapper';

const VBA_VENDOR_TERMS_ACCEPTANCE_VERSION = 'v1';
const VBA_VENDOR_TERMS_ACCEPTANCE_PREFIX = `@MetaMask:vbaTermsOneAccepted:${VBA_VENDOR_TERMS_ACCEPTANCE_VERSION}`;

interface VbaVendorTermsAcceptance {
  disclaimerIds: string[];
}

const getStorageKey = (walletAddress: string): string =>
  `${VBA_VENDOR_TERMS_ACCEPTANCE_PREFIX}:${walletAddress.toLowerCase()}`;

const parseAcceptance = (
  serialized: string | null,
): VbaVendorTermsAcceptance | null => {
  if (!serialized) {
    return null;
  }

  try {
    const parsed = JSON.parse(serialized) as Partial<VbaVendorTermsAcceptance>;
    if (
      !Array.isArray(parsed.disclaimerIds) ||
      !parsed.disclaimerIds.every((id) => typeof id === 'string')
    ) {
      return null;
    }
    return { disclaimerIds: parsed.disclaimerIds };
  } catch {
    return null;
  }
};

export const getVbaVendorTermsAcceptance = (
  walletAddress: string,
): Promise<VbaVendorTermsAcceptance | null> =>
  StorageWrapper.getItem(getStorageKey(walletAddress)).then(parseAcceptance);

export const hasAcceptedVbaVendorTerms = async (
  walletAddress: string,
): Promise<boolean> =>
  Boolean(
    (await getVbaVendorTermsAcceptance(walletAddress))?.disclaimerIds.length,
  );

export const saveVbaVendorTermsAcceptance = async (
  walletAddress: string,
  disclaimerIds: string[],
): Promise<void> => {
  await StorageWrapper.setItem(
    getStorageKey(walletAddress),
    JSON.stringify({ disclaimerIds }),
  );
};
