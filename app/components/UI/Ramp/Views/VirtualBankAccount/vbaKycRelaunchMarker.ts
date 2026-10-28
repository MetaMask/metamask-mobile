import StorageWrapper from '../../../../../store/storage-wrapper';
import Logger from '../../../../../util/Logger';
import type { NavigationBranchState } from '../../../../../core/DeeplinkManager/utils/resetToHomeNav';
import { getVbaOnboardingResumeState } from './routes';
import { getVbaWalletAddress } from './vbaWalletAddress';

const VBA_KYC_RELAUNCH_MARKER_KEY = '@MetaMask:vbaKycRelaunchMarker:v1';
const VBA_KYC_RELAUNCH_RESUMES_KEY = '@MetaMask:vbaKycRelaunchResumes:v1';
const VBA_KYC_RELAUNCH_SOURCE = 'vba-kyc-relaunch';

/** How long after the user leaves the app a relaunch still reopens KYC. */
export const VBA_KYC_RELAUNCH_WINDOW_MS = 2 * 60 * 1000;

/**
 * Automatic resumes allowed in a row before the provider returns, so a provider
 * that crashes the app cannot reopen itself forever.
 */
export const VBA_KYC_MAX_CONSECUTIVE_RESUMES = 2;

// New on every JS runtime, so only a later launch can consume the marker.
const RUNTIME_ID = `${Date.now()}:${Math.random()}`;

interface VbaKycRelaunchMarker {
  walletAddress: string;
  runtimeId: string;
  updatedAt: number;
}

interface VbaKycRelaunchResumes {
  count: number;
  lastAt: number;
}

const getSelectedWalletAddress = (): string | undefined =>
  getVbaWalletAddress()?.toLowerCase();

const isWithinWindow = (since: number, now: number): boolean => {
  const elapsedMs = now - since;
  return elapsedMs >= 0 && elapsedMs <= VBA_KYC_RELAUNCH_WINDOW_MS;
};

const parseJson = <T>(serialized: string | null): Partial<T> | null => {
  if (!serialized) {
    return null;
  }
  try {
    return JSON.parse(serialized) as Partial<T>;
  } catch {
    return null;
  }
};

const parseMarker = (
  serialized: string | null,
): VbaKycRelaunchMarker | null => {
  const parsed = parseJson<VbaKycRelaunchMarker>(serialized);
  if (
    typeof parsed?.walletAddress !== 'string' ||
    typeof parsed.runtimeId !== 'string' ||
    typeof parsed.updatedAt !== 'number'
  ) {
    return null;
  }
  return {
    walletAddress: parsed.walletAddress,
    runtimeId: parsed.runtimeId,
    updatedAt: parsed.updatedAt,
  };
};

const parseResumes = (
  serialized: string | null,
): VbaKycRelaunchResumes | null => {
  const parsed = parseJson<VbaKycRelaunchResumes>(serialized);
  if (typeof parsed?.count !== 'number' || typeof parsed.lastAt !== 'number') {
    return null;
  }
  return { count: parsed.count, lastAt: parsed.lastAt };
};

const logMarkerError = (error: unknown, step: string): void => {
  Logger.error(error as Error, {
    tags: { feature: 'vba-kyc' },
    context: { name: 'vbaKycRelaunchMarker', data: { step } },
  });
};

/**
 * Records that the KYC provider is open for the selected wallet. Call it again
 * when the app goes to the background so the window counts time away from the
 * app.
 */
export const markVbaKycRelaunch = async (): Promise<void> => {
  try {
    const walletAddress = getSelectedWalletAddress();
    if (!walletAddress) {
      return;
    }
    const marker: VbaKycRelaunchMarker = {
      walletAddress,
      runtimeId: RUNTIME_ID,
      updatedAt: Date.now(),
    };
    await StorageWrapper.setItem(
      VBA_KYC_RELAUNCH_MARKER_KEY,
      JSON.stringify(marker),
    );
  } catch (error) {
    logMarkerError(error, 'mark');
  }
};

/** Clears the marker and the resume count once the provider returns. */
export const clearVbaKycRelaunchMarker = async (): Promise<void> => {
  try {
    await StorageWrapper.removeItem(VBA_KYC_RELAUNCH_MARKER_KEY);
    await StorageWrapper.removeItem(VBA_KYC_RELAUNCH_RESUMES_KEY);
  } catch (error) {
    logMarkerError(error, 'clear');
  }
};

/**
 * Deletes a marker left by a previous runtime and returns the main stack state
 * that reopens VBA onboarding when that marker is for the selected wallet and
 * the user left the app within {@link VBA_KYC_RELAUNCH_WINDOW_MS}.
 *
 * A marker from the current runtime is left alone: the provider is still open.
 * After {@link VBA_KYC_MAX_CONSECUTIVE_RESUMES} resumes inside one window, the
 * next relaunch goes home instead.
 */
export const consumeVbaKycResumeState = async (): Promise<
  NavigationBranchState | undefined
> => {
  try {
    const serialized = await StorageWrapper.getItem(
      VBA_KYC_RELAUNCH_MARKER_KEY,
    );
    if (serialized === null) {
      return undefined;
    }

    const marker = parseMarker(serialized);
    if (marker?.runtimeId === RUNTIME_ID) {
      return undefined;
    }
    await StorageWrapper.removeItem(VBA_KYC_RELAUNCH_MARKER_KEY);

    const now = Date.now();
    if (
      !marker ||
      marker.walletAddress !== getSelectedWalletAddress() ||
      !isWithinWindow(marker.updatedAt, now)
    ) {
      return undefined;
    }

    const resumes = parseResumes(
      await StorageWrapper.getItem(VBA_KYC_RELAUNCH_RESUMES_KEY),
    );
    const count =
      resumes && isWithinWindow(resumes.lastAt, now) ? resumes.count : 0;
    if (count >= VBA_KYC_MAX_CONSECUTIVE_RESUMES) {
      return undefined;
    }
    await StorageWrapper.setItem(
      VBA_KYC_RELAUNCH_RESUMES_KEY,
      JSON.stringify({ count: count + 1, lastAt: now }),
    );
    return getVbaOnboardingResumeState(VBA_KYC_RELAUNCH_SOURCE);
  } catch (error) {
    logMarkerError(error, 'consume');
    return undefined;
  }
};
