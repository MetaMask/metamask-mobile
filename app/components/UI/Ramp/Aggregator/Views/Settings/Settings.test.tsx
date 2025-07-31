import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import Settings from './Settings';
import useActivationKeys from '../../hooks/useActivationKeys';
import { RampSDK } from '../../sdk';
import { ActivationKey } from '../../../../../../reducers/fiatOrders/types';
import {
  renderScreen,
  DeepPartial,
} from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import Routes from '../../../../../../constants/navigation/Routes';
import withRampAndDepositSDK from '../../../utils/withRampAndDepositSDK';

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
}));

const mockClearAuthToken = jest.fn();
const mockCheckExistingToken = jest.fn();

const mockUseDepositSDKInitialValues = {
  isInternalBuild: false,
  clearAuthToken: mockClearAuthToken,
  isAuthenticated: false,
  checkExistingToken: mockCheckExistingToken,
};

let mockUseDepositSDKValues = { ...mockUseDepositSDKInitialValues };

jest.mock('../../../Deposit/sdk', () => ({
  useDepositSDK: () => mockUseDepositSDKValues,
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
    mockUseDepositSDKValues = {
      ...mockUseDepositSDKInitialValues,
    };
  });

  it('renders correctly', () => {
    render(Settings);
    expect(screen.toJSON()).toMatchSnapshot();
    expect(withRampAndDepositSDK).toHaveBeenCalled();
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
      mockUseRampSDKValues = {
        ...mockuseRampSDKInitialValues,
        selectedRegion: null,
      };
      render(Settings);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('calls setSelectedRegion with null when pressing reset region', () => {
      render(Settings);
      const resetRegionButton = screen.getByRole('button', {
        name: 'Reset Region',
      });
      fireEvent.press(resetRegionButton);
      expect(mockSetSelectedRegion).toHaveBeenCalledWith(null);
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
        name: 'Add Activation Key',
      });
      const [removeActivationKeyButton] = screen.getAllByRole('button', {
        name: 'Delete Activation Key',
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
        name: 'Add Activation Key',
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
        name: 'Add Activation Key',
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
        name: 'Delete Activation Key',
      });
      fireEvent.press(removeActivationKeyButton);
      expect(mockRemoveActivationKey).toHaveBeenCalledWith('testKey1');
    });
  });
  describe('Provider Authentication', () => {
    it('does not show logout button when not authenticated', () => {
      mockUseDepositSDKValues = {
        ...mockUseDepositSDKInitialValues,
        isInternalBuild: true,
        isAuthenticated: false,
      };
      render(Settings);
      const logoutButton = screen.queryByRole('button', {
        name: 'Log out of Transak',
      });
      expect(logoutButton).toBeNull();
    });

    it('shows logout button when authenticated', () => {
      mockUseDepositSDKValues = {
        ...mockUseDepositSDKInitialValues,
        isInternalBuild: true,
        isAuthenticated: true,
      };
      render(Settings);
      const logoutButton = screen.getByRole('button', {
        name: 'Log out of Transak',
      });
      expect(logoutButton).toBeTruthy();
    });

    it('calls clearAuthToken when pressing logout button', () => {
      mockUseDepositSDKValues = {
        ...mockUseDepositSDKInitialValues,
        isInternalBuild: true,
        isAuthenticated: true,
      };
      render(Settings);
      const logoutButton = screen.getByRole('button', {
        name: 'Log out of Transak',
      });
      fireEvent.press(logoutButton);
      expect(mockClearAuthToken).toHaveBeenCalled();
    });

    it('calls checkExistingToken on component mount', () => {
      render(Settings);
      expect(mockCheckExistingToken).toHaveBeenCalled();
    });
  });
});
