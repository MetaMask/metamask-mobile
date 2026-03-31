import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ProtectWalletMandatoryModal from './ProtectWalletMandatoryModal';
import { backgroundState } from '../../../util/test/initial-root-state';
import { InteractionManager } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../util/test/analyticsMock';

// Mock Device utility
const mockIsIphoneX = jest.fn();
jest.mock('../../../util/device', () => ({
  isIphoneX: () => mockIsIphoneX(),
  isAndroid: () => false,
  isIos: () => true,
  getDeviceWidth: () => 375,
  getDeviceHeight: () => 812,
}));

// Mock the navigation
const mockNavigate = jest.fn();
const mockDangerouslyGetState = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      dangerouslyGetState: mockDangerouslyGetState,
    }),
  };
});

// Mock the analytics hook
jest.mock('../../hooks/useAnalytics/useAnalytics');

// Mock Engine
jest.mock('../../../core/Engine', () => ({
  hasFunds: jest.fn().mockReturnValue(true),
}));

// Mock InteractionManager
jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  return {
    ...actualRN,
    InteractionManager: {
      runAfterInteractions: jest.fn((callback) => callback()),
    },
  };
});

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      SeedlessOnboardingController: {
        vault: undefined,
      },
    },
  },
  user: {
    passwordSet: false,
    seedphraseBackedUp: false,
  },
};

describe('ProtectWalletMandatoryModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(createMockUseAnalyticsHook());
    mockDangerouslyGetState.mockReturnValue({
      routes: [{ name: 'Home' }],
    });
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(<ProtectWalletMandatoryModal />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly on iPhoneX', () => {
    mockIsIphoneX.mockReturnValue(true);

    const { toJSON } = renderWithProvider(<ProtectWalletMandatoryModal />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('tracks analytics event after interactions when securing wallet', () => {
    const { getByText } = renderWithProvider(<ProtectWalletMandatoryModal />, {
      state: initialState,
    });

    const secureButton = getByText('Protect wallet');
    fireEvent.press(secureButton);

    expect(mockNavigate).toHaveBeenCalledWith('SetPasswordFlow', undefined);
    expect(InteractionManager.runAfterInteractions).toHaveBeenCalled();
  });

  it('does not render when in seedless onboarding login flow', () => {
    const { queryByText } = renderWithProvider(
      <ProtectWalletMandatoryModal />,
      {
        state: {
          ...initialState,
          engine: {
            backgroundState: {
              ...initialState.engine.backgroundState,
              SeedlessOnboardingController: { vault: 'encrypted-vault-data' },
            },
          },
        },
      },
    );
    expect(queryByText('Protect wallet')).toBeNull();
  });
});
