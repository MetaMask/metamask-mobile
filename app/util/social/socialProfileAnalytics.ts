import StorageWrapper from '../../store/storage-wrapper';

const SOCIAL_PROFILE_CREATED_AT_KEY = 'socialProfileCreatedAt';

/**
 * Whether the user has a Social profile. Uses the linked EVM account, the same
 * signal the profile gate uses, so analytics and the gate agree.
 */
export const hasSocialProfileFromLinkedAddress = (
  linkedAddress: string | null | undefined,
): boolean =>
  typeof linkedAddress === 'string' && linkedAddress.trim().length > 0;

/** When the Social profile was first created on this install, if known. */
export const getSocialProfileCreatedAt = (): string | undefined =>
  StorageWrapper.getItemSync(SOCIAL_PROFILE_CREATED_AT_KEY) || undefined;

/**
 * Stores the first profile creation time. Later calls keep the stored value,
 * so the trait is set once.
 */
export const recordSocialProfileCreatedAt = async (
  now: Date = new Date(),
): Promise<void> => {
  if (getSocialProfileCreatedAt()) {
    return;
  }
  await StorageWrapper.setItem(
    SOCIAL_PROFILE_CREATED_AT_KEY,
    now.toISOString(),
  );
};
