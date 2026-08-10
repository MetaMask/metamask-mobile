import { IconColor, IconName } from '@metamask/design-system-react-native';
import { TrustSignalDisplayState } from '../types/trustSignals';

export interface TrustSignalIcon {
  name: IconName;
  color: IconColor;
}

export function getTrustSignalIcon(
  displayState: TrustSignalDisplayState,
): TrustSignalIcon | null {
  switch (displayState) {
    case TrustSignalDisplayState.Verified:
      return { name: IconName.VerifiedFilled, color: IconColor.InfoDefault };
    case TrustSignalDisplayState.Malicious:
      return { name: IconName.Danger, color: IconColor.ErrorDefault };
    case TrustSignalDisplayState.Warning:
      return { name: IconName.Warning, color: IconColor.WarningDefault };
    case TrustSignalDisplayState.Petname:
    case TrustSignalDisplayState.Recognized:
      return null;
    case TrustSignalDisplayState.Loading:
    case TrustSignalDisplayState.Unknown:
    default:
      return null;
  }
}
