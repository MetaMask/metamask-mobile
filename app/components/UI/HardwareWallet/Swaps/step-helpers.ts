import { IconName, IconColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import {
  HardwareWalletsSwapsStep,
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsStepStatus,
} from './HardwareWalletsSwaps.state';

interface StepTitleOptions {
  amount?: string;
  tokenSymbol?: string;
}

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
    return strings('bridge.hardware_wallet_progress.approving_token', {
      amount,
      symbol,
    });
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

export function getStepDescription(step: HardwareWalletsSwapsStep) {
  if (step.status === HardwareWalletsSwapsStepStatus.Rejected) {
    return strings('bridge.hardware_wallet_progress.rejected');
  }

  if (step.kind === HardwareWalletsSwapsStepKind.Approval) {
    if (step.address) {
      return strings('bridge.hardware_wallet_progress.spender_address', {
        address: step.address,
      });
    }
    return undefined;
  }

  if (step.address) {
    return strings('bridge.hardware_wallet_progress.recipient_address', {
      address: step.address,
    });
  }
  return undefined;
}

export interface StepIconResult {
  name: typeof IconName.Check | typeof IconName.Close | undefined;
  color:
    | typeof IconColor.SuccessDefault
    | typeof IconColor.ErrorDefault
    | undefined;
  label: string | undefined;
  isSigning: boolean;
}

export function getStepIcon(
  step: HardwareWalletsSwapsStep,
  index: number,
): StepIconResult {
  if (step.status === HardwareWalletsSwapsStepStatus.Signed) {
    return {
      name: IconName.Check,
      color: IconColor.SuccessDefault,
      label: undefined,
      isSigning: false,
    };
  }

  if (step.status === HardwareWalletsSwapsStepStatus.Rejected) {
    return {
      name: IconName.Close,
      color: IconColor.ErrorDefault,
      label: undefined,
      isSigning: false,
    };
  }

  if (step.status === HardwareWalletsSwapsStepStatus.Signing) {
    return {
      name: undefined,
      color: undefined,
      label: undefined,
      isSigning: true,
    };
  }

  return {
    name: undefined,
    color: undefined,
    label: `${index + 1}`,
    isSigning: false,
  };
}
