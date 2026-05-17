import { IconName, IconColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  HardwareWalletsSwapsStep,
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsStepStatus,
} from './HardwareWalletsSwaps.state';

export function getStepTitle(step: HardwareWalletsSwapsStep) {
  if (step.kind === HardwareWalletsSwapsStepKind.Approval) {
    return step.status === HardwareWalletsSwapsStepStatus.Signed
      ? strings('bridge.hardware_wallet_progress.approved_token')
      : strings('bridge.hardware_wallet_progress.approve_token');
  }

  return step.status === HardwareWalletsSwapsStepStatus.Signed
    ? strings('bridge.hardware_wallet_progress.sent_token')
    : strings('bridge.hardware_wallet_progress.send_token');
}

export function getStepDescription(step: HardwareWalletsSwapsStep) {
  if (step.status === HardwareWalletsSwapsStepStatus.Rejected) {
    return strings('bridge.hardware_wallet_progress.rejected');
  }

  if (step.kind === HardwareWalletsSwapsStepKind.Approval) {
    return step.address ?? strings('bridge.hardware_wallet_progress.spender');
  }

  return step.address ?? strings('bridge.hardware_wallet_progress.recipient');
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
