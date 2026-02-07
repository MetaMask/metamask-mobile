import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { TrustSignalDisplayState } from '../types/trustSignals';

/**
 * Icon properties for trust signal display.
 */
export interface TrustSignalIcon {
  name: IconName;
  color: IconColor;
}

/**
 * Get the appropriate icon for a trust signal display state.
 *
 * @param displayState - The trust signal display state
 * @returns Icon properties or null if no icon should be displayed
 */
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
      // Petnames show the fox badge (already handled in Name component)
      return null;
    case TrustSignalDisplayState.Recognized:
      // Recognized addresses don't show an additional trust icon
      return null;
    case TrustSignalDisplayState.Loading:
    case TrustSignalDisplayState.Unknown:
    default:
      return null;
  }
}
