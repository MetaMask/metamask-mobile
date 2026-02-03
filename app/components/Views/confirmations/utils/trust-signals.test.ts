import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { TrustSignalDisplayState } from '../types/trustSignals';
import { getTrustSignalIcon, TrustSignalIcon } from './trust-signals';

describe('getTrustSignalIcon', () => {
  it('returns verified icon for Verified state', () => {
    const result = getTrustSignalIcon(TrustSignalDisplayState.Verified);

    expect(result).toEqual<TrustSignalIcon>({
      name: IconName.VerifiedFilled,
      color: IconColor.Info,
    });
  });

  it('returns danger icon for Malicious state', () => {
    const result = getTrustSignalIcon(TrustSignalDisplayState.Malicious);

    expect(result).toEqual<TrustSignalIcon>({
      name: IconName.Danger,
      color: IconColor.Error,
    });
  });

  it('returns warning icon for Warning state', () => {
    const result = getTrustSignalIcon(TrustSignalDisplayState.Warning);

    expect(result).toEqual<TrustSignalIcon>({
      name: IconName.Warning,
      color: IconColor.Warning,
    });
  });

  it('returns null for Petname state', () => {
    const result = getTrustSignalIcon(TrustSignalDisplayState.Petname);

    expect(result).toBeNull();
  });

  it('returns null for Recognized state', () => {
    const result = getTrustSignalIcon(TrustSignalDisplayState.Recognized);

    expect(result).toBeNull();
  });

  it('returns null for Unknown state', () => {
    const result = getTrustSignalIcon(TrustSignalDisplayState.Unknown);

    expect(result).toBeNull();
  });

  it('returns null for Loading state', () => {
    const result = getTrustSignalIcon(TrustSignalDisplayState.Loading);

    expect(result).toBeNull();
  });
});
