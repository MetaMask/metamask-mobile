import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { getBuildNumber } from 'react-native-device-info';
import useMinimumVersions from './useMinimumVersions';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-native-device-info', () => ({
  getBuildNumber: jest.fn(),
}));

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn((callback) => callback()),
  },
}));

jest.mock('../../UI/UpdateNeeded/UpdateNeeded', () => ({
  createUpdateNeededNavDetails: jest.fn(),
}));

describe('useMinimumVersions', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  });

  it('requires update only if automaticSecurityChecksEnabled', () => {
    (useSelector as jest.Mock).mockImplementation(() => ({
      security: { automaticSecurityChecksEnabled: false },
      featureFlags: {
        featureFlags: { mobileMinimumVersions: { appMinimumBuild: 100 } },
      },
    }));

    (getBuildNumber as jest.Mock).mockReturnValue('101');

    renderHook(() => useMinimumVersions());

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('should not navigate if currentBuildNumber is greater than appMinimumBuild', () => {
    (useSelector as jest.Mock).mockImplementation(() => ({
      security: { automaticSecurityChecksEnabled: true },
      featureFlags: {
        featureFlags: { mobileMinimumVersions: { appMinimumBuild: 100 } },
      },
    }));

    (getBuildNumber as jest.Mock).mockReturnValue('101');

    renderHook(() => useMinimumVersions());

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });
});
