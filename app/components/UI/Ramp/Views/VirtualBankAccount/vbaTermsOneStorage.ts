import StorageWrapper from '../../../../../store/storage-wrapper';

const VBA_TERMS_ONE_ACCEPTANCE_VERSION = 'v1';
const VBA_TERMS_ONE_ACCEPTANCE_PREFIX = `@MetaMask:vbaTermsOneAccepted:${VBA_TERMS_ONE_ACCEPTANCE_VERSION}`;

interface VbaTermsOneAcceptance {
  disclaimerIds: string[];
}

const getStorageKey = (walletAddress: string): string =>
  `${VBA_TERMS_ONE_ACCEPTANCE_PREFIX}:${walletAddress.toLowerCase()}`;

const parseAcceptance = (
  serialized: string | null,
): VbaTermsOneAcceptance | null => {
  if (!serialized) {
    return null;
  }

  try {
    const parsed = JSON.parse(serialized) as Partial<VbaTermsOneAcceptance>;
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

export const getVbaTermsOneAcceptance = (
  walletAddress: string,
): Promise<VbaTermsOneAcceptance | null> =>
  StorageWrapper.getItem(getStorageKey(walletAddress)).then(parseAcceptance);

export const hasAcceptedVbaTermsOne = async (
  walletAddress: string,
): Promise<boolean> =>
  Boolean(
    (await getVbaTermsOneAcceptance(walletAddress))?.disclaimerIds.length,
  );

export const saveVbaTermsOneAcceptance = async (
  walletAddress: string,
  disclaimerIds: string[],
): Promise<void> => {
  await StorageWrapper.setItem(
    getStorageKey(walletAddress),
    JSON.stringify({ disclaimerIds }),
  );
};
