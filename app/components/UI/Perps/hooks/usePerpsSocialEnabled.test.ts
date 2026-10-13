import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { getVersion } from 'react-native-device-info';
import type { Json } from '@metamask/utils';
import type { StateWithPartialEngine } from '../../../../selectors/featureFlagController/types';
import { PERPS_SOCIAL_ENABLED_FLAG_KEY } from '../selectors/featureFlags';
import {
  SOCIAL_V1_AB_KEY,
  SocialV1Variant,
} from '../../../Views/SocialLeaderboard/SocialV1View/abTestConfig';
import { usePerpsSocialEnabled } from './usePerpsSocialEnabled';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const renderWithFlags = ({
  perpsSocialEnabled,
  socialV1Variant,
}: {
  perpsSocialEnabled: boolean;
  socialV1Variant?: SocialV1Variant;
}) => {
  const remoteFeatureFlags: Record<string, Json> = {
    [PERPS_SOCIAL_ENABLED_FLAG_KEY]: {
      enabled: perpsSocialEnabled,
      minimumVersion: '0.0.0',
    },
  };
  if (socialV1Variant) {
    remoteFeatureFlags[SOCIAL_V1_AB_KEY] = socialV1Variant;
  }
  const state: StateWithPartialEngine = {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags,
          cacheTimestamp: 0,
        },
      },
    },
  };
  mockUseSelector.mockImplementation((selector) => selector(state));

  return renderHook(() => usePerpsSocialEnabled());
};

describe('usePerpsSocialEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getVersion).mockReturnValue('8.17.0');
  });

  it('returns true when perpsSocialEnabled is on and Social V1 is in treatment', () => {
    const { result } = renderWithFlags({
      perpsSocialEnabled: true,
      socialV1Variant: SocialV1Variant.Treatment,
    });

    expect(result.current).toBe(true);
  });

  it('returns false when perpsSocialEnabled is off even if Social V1 is in treatment', () => {
    const { result } = renderWithFlags({
      perpsSocialEnabled: false,
      socialV1Variant: SocialV1Variant.Treatment,
    });

    expect(result.current).toBe(false);
  });

  it('returns false when Social V1 is in control even if perpsSocialEnabled is on', () => {
    const { result } = renderWithFlags({
      perpsSocialEnabled: true,
      socialV1Variant: SocialV1Variant.Control,
    });

    expect(result.current).toBe(false);
  });

  it('returns false when perpsSocialEnabled is off and Social V1 is in control', () => {
    const { result } = renderWithFlags({
      perpsSocialEnabled: false,
      socialV1Variant: SocialV1Variant.Control,
    });

    expect(result.current).toBe(false);
  });

  it('returns false when Social V1 is unresolved even if perpsSocialEnabled is on', () => {
    const { result } = renderWithFlags({ perpsSocialEnabled: true });

    expect(result.current).toBe(false);
  });
});
