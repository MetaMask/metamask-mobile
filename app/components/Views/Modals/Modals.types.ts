/**
 * Modal navigation parameters
 */

/** Root modal flow parameters */
export interface RootModalFlowParams {
  screen: string;
  params?: Record<string, unknown>;
}

/** Modal confirmation parameters */
export interface ModalConfirmationParams {
  title?: string;
  description?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

/** Modal mandatory parameters */
export interface ModalMandatoryParams {
  title?: string;
  description?: string;
  ctaText?: string;
  onCta?: () => void;
}

/** Options sheet parameters */
export interface OptionsSheetParams {
  options?: {
    label: string;
    onPress: () => void;
    icon?: string;
  }[];
}

/** Select SRP parameters */
export interface SelectSRPParams {
  onSelect?: (keyringId: string) => void;
}

/** Seedphrase modal parameters */
export interface SeedphraseModalParams {
  seedPhrase?: string[];
}

/** Transaction details sheet parameters */
export interface TransactionDetailsSheetParams {
  transactionId?: string;
}

/** Show NFT display media parameters */
export interface ShowNftDisplayMediaParams {
  uri?: string;
}

/** Origin spam modal parameters */
export interface OriginSpamModalParams {
  origin?: string;
}

/** Region selector parameters */
export interface RegionSelectorParams {
  onSelect?: (regionId: string) => void;
}

/** Fox loader parameters */
export interface FoxLoaderParams {
  loadingText?: string;
}

/** Snap settings parameters */
export interface SnapSettingsParams {
  snapId?: string;
}
