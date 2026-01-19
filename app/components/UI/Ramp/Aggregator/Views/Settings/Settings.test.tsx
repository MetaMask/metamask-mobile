import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import Settings from './Settings';
import useActivationKeys from '../../hooks/useActivationKeys';
import { RampSDK, withRampSDK } from '../../sdk';
import { ActivationKey } from '../../../../../../reducers/fiatOrders/types';
import {
  renderScreen,
  DeepPartial,
} from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import Routes from '../../../../../../constants/navigation/Routes';
import useRampsController from '../../../hooks/useRampsController';
import { UserRegion } from '@metamask/ramps-controller';

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.RAMP.SETTINGS,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
  };
});

jest.mock('../../../utils/withRampAndDepositSDK', () =>
  jest.fn((Component) => (props: Record<string, unknown>) => (
    <Component {...props} />
  )),
);

const mockedActivationKeys: ActivationKey[] = [
  {
    key: 'testKey1',
    label: 'test key 1',
    active: true,
  },

  {
    key: 'testKey2',
    label: 'test key 2',
    active: false,
  },
];

const mockUpdateActivationKey = jest.fn();
const mockAddActivationKey = jest.fn();
const mockRemoveActivationKey = jest.fn();

const mockUseActivationKeysInitialValues: ReturnType<typeof useActivationKeys> =
  {
    isLoadingKeys: false,
    activationKeys: mockedActivationKeys,
    updateActivationKey: mockUpdateActivationKey,
    addActivationKey: mockAddActivationKey,
    removeActivationKey: mockRemoveActivationKey,
  };

let mockUseActivationKeysValues = mockUseActivationKeysInitialValues;

jest.mock('../../hooks/useActivationKeys', () =>
  jest.fn(() => mockUseActivationKeysValues),
);

const mockSetUserRegion = jest.fn();
const mockFetchUserRegion = jest.fn();
const mockFetchProviders = jest.fn();
const mockFetchTokens = jest.fn();
const mockFetchCountries = jest.fn();
const mockSetPreferredProvider = jest.fn();

const createMockUserRegion = (regionCode: string): UserRegion => {
  const parts = regionCode.toLowerCase().split('-');
  const countryCode = parts[0].toUpperCase();
  const stateCode = parts[1]?.toUpperCase();

  return {
    country: {
      isoCode: countryCode,
      flag: '🇪🇺',
      name: 'Europe Union',
      phone: { prefix: '', placeholder: '', template: '' },
      currency: '',
      supported: true,
    },
    state: stateCode
      ? {
          stateId: stateCode,
          name: stateCode,
          supported: true,
        }
      : null,
    regionCode: regionCode.toLowerCase(),
  };
};

const mockUseRampsControllerInitialValues: ReturnType<
  typeof useRampsController
> = {
  userRegion: createMockUserRegion('eu'),
  userRegionLoading: false,
  userRegionError: null,
  setUserRegion: mockSetUserRegion,
  fetchUserRegion: mockFetchUserRegion,
  preferredProvider: null,
  setPreferredProvider: mockSetPreferredProvider,
  providers: [],
  providersLoading: false,
  providersError: null,
  fetchProviders: mockFetchProviders,
  tokens: null,
  tokensLoading: false,
  tokensError: null,
  fetchTokens: mockFetchTokens,
  countries: null,
  countriesLoading: false,
  countriesError: null,
  fetchCountries: mockFetchCountries,
};

let mockUseRampsControllerValues = mockUseRampsControllerInitialValues;

jest.mock('../../../hooks/useRampsController', () =>
  jest.fn(() => mockUseRampsControllerValues),
);

const mockSetSelectedRegion = jest.fn();

const mockuseRampSDKInitialValues: DeepPartial<RampSDK> = {
  selectedRegion: {
    emoji: '🇪🇺',
    name: 'Europe Union',
  },
  setSelectedRegion: mockSetSelectedRegion,
  isInternalBuild: false,
};

let mockUseRampSDKValues: DeepPartial<RampSDK> = {
  ...mockuseRampSDKInitialValues,
};

jest.mock('../../sdk', () => ({
  useRampSDK: () => mockUseRampSDKValues,
  withRampSDK: jest.fn().mockImplementation((Component) => Component),
}));

describe('Settings', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockUseActivationKeysValues = {
      ...mockUseActivationKeysInitialValues,
    };
    mockUseRampSDKValues = {
      ...mockuseRampSDKInitialValues,
    };
    mockUseRampsControllerValues = {
      ...mockUseRampsControllerInitialValues,
    };
  });

  it('renders correctly', () => {
    render(Settings);
    expect(screen.toJSON()).toMatchSnapshot();
    expect(withRampSDK).toHaveBeenCalled();
  });

  it('renders correctly for internal builds', () => {
    mockUseRampSDKValues = {
      ...mockuseRampSDKInitialValues,
      isInternalBuild: true,
    };
    render(Settings);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  describe('Region', () => {
    it('renders correctly when region is set', () => {
      render(Settings);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('renders correctly when region is not set', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        userRegion: null,
      };
      render(Settings);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('renders correctly when region has state', () => {
      mockUseRampsControllerValues = {
        ...mockUseRampsControllerInitialValues,
        userRegion: createMockUserRegion('eu-fr'),
      };
      render(Settings);
      expect(screen.toJSON()).toMatchSnapshot();
    });
  });

  describe('Activation Keys', () => {
    beforeEach(() => {
      mockUseRampSDKValues = {
        ...mockuseRampSDKInitialValues,
        isInternalBuild: true,
      };
    });

    it('renders correctly when is loading', () => {
      mockUseActivationKeysValues = {
        ...mockUseActivationKeysInitialValues,
        isLoadingKeys: true,
      };

      render(Settings);
      expect(screen.toJSON()).toMatchSnapshot();
      const addActivationKeyButton = screen.getByRole('button', {
        name: 'Add activation key',
      });
      const [removeActivationKeyButton] = screen.getAllByRole('button', {
        name: 'Delete activation key',
      });
      const [switchButton] = screen.getAllByRole('switch');

      expect(addActivationKeyButton.props.disabled).toBe(true);
      expect(removeActivationKeyButton.props.disabled).toBe(true);
      expect(switchButton.props.disabled).toBe(true);
    });

    it('renders correctly when there are no keys', () => {
      mockUseActivationKeysValues = {
        ...mockUseActivationKeysInitialValues,
        activationKeys: [],
      };
      render(Settings);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('navigates to add activation key when pressing add new key', () => {
      render(Settings);
      const addActivationKeyButton = screen.getByRole('button', {
        name: 'Add activation key',
      });
      fireEvent.press(addActivationKeyButton);
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.RAMP.ACTIVATION_KEY_FORM,
        {
          onSubmit: expect.any(Function),
          active: true,
          key: '',
          label: '',
        },
      );
    });

    it('calls addActivationKey when navigated view calls onSubmit', () => {
      const testKey = 'example-test-key';
      const testLabel = 'example-test-label';
      mockNavigate.mockImplementationOnce((_route, { onSubmit }) => {
        onSubmit(testKey, testLabel);
      });
      render(Settings);
      const addActivationKeyButton = screen.getByRole('button', {
        name: 'Add activation key',
      });
      fireEvent.press(addActivationKeyButton);
      expect(mockAddActivationKey).toHaveBeenCalledWith(testKey, testLabel);
    });

    it('updates the activation key value when pressing the switch', () => {
      const testActivationKey = {
        ...mockUseActivationKeysInitialValues.activationKeys[0],
        active: false,
      };
      mockUseActivationKeysValues = {
        ...mockUseActivationKeysInitialValues,
        activationKeys: [testActivationKey],
      };
      render(Settings);
      const switchButton = screen.getByRole('switch');
      fireEvent(switchButton, 'onValueChange');
      expect(mockUpdateActivationKey).toHaveBeenCalledWith(
        testActivationKey.key,
        testActivationKey.label,
        !testActivationKey.active,
      );
    });

    it('calls removeActivationKey when pressing remove icon', () => {
      const testActivationKey = {
        ...mockUseActivationKeysInitialValues.activationKeys[0],
        active: false,
      };
      mockUseActivationKeysValues = {
        ...mockUseActivationKeysInitialValues,
        activationKeys: [testActivationKey],
      };
      render(Settings);
      const removeActivationKeyButton = screen.getByRole('button', {
        name: 'Delete activation key',
      });
      fireEvent.press(removeActivationKeyButton);
      expect(mockRemoveActivationKey).toHaveBeenCalledWith('testKey1');
    });
  });
});
