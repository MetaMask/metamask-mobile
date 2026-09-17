import { IconName, IconColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { renderShortAddress } from '../../../../util/address';
import {
  HardwareWalletsSwapsStep,
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsStepStatus,
} from './HardwareWalletsSwaps.state';

/**
 * Number of QR scans in one signing cycle per transaction
 * (display request + camera-read response).
 */
export const QR_SCANS_PER_TRANSACTION = 2;

/**
 * Total QR scans across the whole signing flow.
 *
 * @param transactionSteps - Number of transactions to sign (`progress.totalSteps`).
 * @returns Total QR scans (transactions × {@link QR_SCANS_PER_TRANSACTION}).
 */
export function getTotalQrScans(transactionSteps: number): number {
  return transactionSteps * QR_SCANS_PER_TRANSACTION;
}

/**
 * 1-based scan step for the **display phase** (Phase A) of a transaction:
 * MetaMask shows the request QR and the user scans it with their wallet.
 *
 * @param transactionStep - Zero-based transaction index (`progress.currentStep`).
 * @returns The 1-based scan number for the display phase.
 */
export function getDisplayScanStep(transactionStep: number): number {
  return transactionStep * QR_SCANS_PER_TRANSACTION + 1;
}

/**
 * 1-based scan step for the **camera phase** (Phase B) of a transaction:
 * MetaMask's camera reads the response QR shown on the wallet.
 *
 * @param transactionStep - Zero-based transaction index (`progress.currentStep`).
 * @returns The 1-based scan number for the camera phase.
 */
export function getCameraScanStep(transactionStep: number): number {
  return (transactionStep + 1) * QR_SCANS_PER_TRANSACTION;
}

interface StepTitleOptions {
  /** Token amount displayed in the step title. */
  amount?: string;
  /** Token symbol displayed in the step title. */
  tokenSymbol?: string;
  /** Destination token amount; both dest values turn the transaction step into swap copy. */
  destAmount?: string;
  /** Destination token symbol; both dest values turn the transaction step into swap copy. */
  destTokenSymbol?: string;
}

/**
 * Returns the localized title for a hardware wallet swap progress step.
 *
 * Title text varies by step kind (approval vs transaction) and status
 * (waiting, signing, signed, or rejected). Transaction steps additionally
 * show same-chain swap copy ("Swap X FROM for Y TO") when destination
 * amount and symbol are both provided; otherwise send copy is used
 * (extension parity: missing dest data → send labels). Approval and
 * fee-transfer steps ignore the destination options.
 *
 * @param step - The swap step to render.
 * @param options - Optional amount/token symbol and swap destination values.
 * @returns Localized step title string.
 */
export function getStepTitle(
  step: HardwareWalletsSwapsStep,
  options?: StepTitleOptions,
) {
  const amount = options?.amount ?? '';
  const symbol = options?.tokenSymbol ?? '';

  if (step.kind === HardwareWalletsSwapsStepKind.Approval) {
    if (step.status === HardwareWalletsSwapsStepStatus.Signed) {
      return strings('bridge.hardware_wallet_progress.approved_token', {
        amount,
        symbol,
      });
    }
    // Extension parity: 'Approve' for pending, active, AND rejected approval
    // steps — only Complete gets 'Approved' (no 'Approving' variant exists).
    return strings('bridge.hardware_wallet_progress.approve_token', {
      amount,
      symbol,
    });
  }

  if (step.kind === HardwareWalletsSwapsStepKind.FeeTransfer) {
    if (step.status === HardwareWalletsSwapsStepStatus.Signed) {
      return strings(
        'bridge.hardware_wallet_progress.network_fee_paid_with_symbol',
        { amount, symbol },
      );
    }
    // Waiting / Signing / Rejected all use the "paying" form.
    return strings(
      'bridge.hardware_wallet_progress.paying_network_fee_with_symbol',
      { amount, symbol },
    );
  }

  // Same-chain swap copy for the Transaction step: only when BOTH dest values
  // are present; otherwise fall back to send copy (extension parity).
  if (options?.destAmount && options?.destTokenSymbol) {
    const swapParams = {
      amount,
      symbol,
      destAmount: options.destAmount,
      destSymbol: options.destTokenSymbol,
    };
    if (step.status === HardwareWalletsSwapsStepStatus.Signed) {
      return strings('bridge.hardware_wallet_progress.swapped_amount', swapParams);
    }
    if (
      step.status === HardwareWalletsSwapsStepStatus.Signing ||
      step.status === HardwareWalletsSwapsStepStatus.Rejected
    ) {
      return strings('bridge.hardware_wallet_progress.swapping_amount', swapParams);
    }
    return strings('bridge.hardware_wallet_progress.swap_amount', swapParams);
  }

  if (step.status === HardwareWalletsSwapsStepStatus.Signed) {
    return strings('bridge.hardware_wallet_progress.sent_token', {
      amount,
      symbol,
    });
  }
  if (
    step.status === HardwareWalletsSwapsStepStatus.Signing ||
    step.status === HardwareWalletsSwapsStepStatus.Rejected
  ) {
    return strings('bridge.hardware_wallet_progress.sending_token', {
      amount,
      symbol,
    });
  }
  return strings('bridge.hardware_wallet_progress.send_token', {
    amount,
    symbol,
  });
}

/**
 * Returns the localized secondary description lines for a swap progress step.
 *
 * Rejected steps show a single generic rejection message (replacing any
 * details). Approval steps show the approved token contract and the spender
 * address, each on its own line when available. Transaction steps show the
 * recipient address. All addresses are shortened for display.
 *
 * @param step - The swap step to render.
 * @returns Localized description lines; empty when no description applies.
 */
export function getStepDescription(step: HardwareWalletsSwapsStep): string[] {
  if (step.status === HardwareWalletsSwapsStepStatus.Rejected) {
    return [strings('bridge.hardware_wallet_progress.rejected')];
  }

  if (step.kind === HardwareWalletsSwapsStepKind.Approval) {
    const lines: string[] = [];
    if (step.tokenAddress) {
      lines.push(
        strings('bridge.hardware_wallet_progress.token_address', {
          address: renderShortAddress(step.tokenAddress),
        }),
      );
    }
    if (step.address) {
      lines.push(
        strings('bridge.hardware_wallet_progress.spender_address', {
          address: renderShortAddress(step.address),
        }),
      );
    }
    return lines;
  }

  // Send-only FeeTransfer step: no description. The gas token's symbol is
  // already in the title; the gas-token address is intentionally not shown.
  if (step.kind === HardwareWalletsSwapsStepKind.FeeTransfer) {
    return [];
  }

  if (step.address) {
    return [
      strings('bridge.hardware_wallet_progress.recipient_address', {
        address: renderShortAddress(step.address),
      }),
    ];
  }
  return [];
}

/** Visual state for the circular step indicator in {@link StepRow}. */
export interface StepIconResult {
  /** Icon to render for completed or rejected steps. */
  name?: typeof IconName.Check | typeof IconName.Close;
  /** Icon color for completed or rejected steps. */
  color?: typeof IconColor.SuccessDefault | typeof IconColor.ErrorDefault;
  /** 1-based step number shown while the step is waiting. */
  label?: string;
  /** Whether to render a signing spinner instead of an icon or label. */
  isSigning: boolean;
}

/**
 * Maps a swap step status to the icon, label, or spinner shown in the step row.
 *
 * @param step - The swap step to render.
 * @param index - Zero-based position of the step in the progress list.
 * @returns Visual configuration for the step indicator.
 */
export function getStepIcon(
  step: HardwareWalletsSwapsStep,
  index: number,
): StepIconResult {
  if (step.status === HardwareWalletsSwapsStepStatus.Signed) {
    return {
      name: IconName.Check,
      color: IconColor.SuccessDefault,
      isSigning: false,
    };
  }

  if (step.status === HardwareWalletsSwapsStepStatus.Rejected) {
    return {
      name: IconName.Close,
      color: IconColor.ErrorDefault,
      isSigning: false,
    };
  }

  if (step.status === HardwareWalletsSwapsStepStatus.Signing) {
    return {
      isSigning: true,
    };
  }

  return {
    label: `${index + 1}`,
    isSigning: false,
  };
}
