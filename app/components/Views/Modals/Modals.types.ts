import type { TransactionMeta } from '@metamask/transaction-controller';

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
  cancelLabel?: string;
  confirmLabel?: string;
  isDanger?: boolean;
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

/** Transaction details sheet parameters (matches TransactionDetailsSheet route). */
export interface TransactionDetailsSheetParams {
  tx: TransactionMeta;
  transactionElement: {
    actionKey: string;
    value?: string;
    [key: string]: unknown;
  };
  transactionDetails: {
    hash?: string;
    renderFrom?: string;
    renderTo?: string;
    renderValue?: string;
    summaryAmount?: string;
    summaryFee?: string;
    summaryTotalAmount?: string;
    summarySecondaryTotalAmount?: string;
    transactionType?: string;
    txChainId?: string;
    [key: string]: unknown;
  };
  showSpeedUpModal: () => void;
  showCancelModal: () => void;
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
