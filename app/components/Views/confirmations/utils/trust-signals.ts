import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
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
      return { name: IconName.VerifiedFilled, color: IconColor.Info };
    case TrustSignalDisplayState.Malicious:
      return { name: IconName.Danger, color: IconColor.Error };
    case TrustSignalDisplayState.Warning:
      return { name: IconName.Warning, color: IconColor.Warning };
    case TrustSignalDisplayState.Petname:
    case TrustSignalDisplayState.Recognized:
      return null;
    case TrustSignalDisplayState.Loading:
    case TrustSignalDisplayState.Unknown:
    default:
      return null;
  }
}
