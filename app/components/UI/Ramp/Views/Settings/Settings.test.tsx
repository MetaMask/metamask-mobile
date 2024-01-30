import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import Settings from './Settings';
import useActivationKeys from '../../hooks/useActivationKeys';
import { RampSDK, withRampSDK } from '../../sdk';
import { ActivationKey } from '../../../../../reducers/fiatOrders/types';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import Routes from '../../../../../constants/navigation/Routes';

type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.RAMP.SETTINGS,
    },
    {
      state: {
        engine: {
          backgroundState: initialBackgroundState,
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

const mockedActivationKeys: ActivationKey[] = [
  {
    key: 'testKey1',
    active: true,
  },

  {
    key: 'testKey2',
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
        Routes.RAMP.ADD_ACTIVATION_KEY,
        {
          onSubmit: expect.any(Function),
        },
      );
    });

    it('calls addActivationKey when navigated view calls onSubmit', () => {
      const testKey = 'example-test-key';
      mockNavigate.mockImplementationOnce((_route, { onSubmit }) => {
        onSubmit(testKey);
      });
      render(Settings);
      const addActivationKeyButton = screen.getByRole('button', {
        name: 'Add Activation Key',
      });
      fireEvent.press(addActivationKeyButton);
      expect(mockAddActivationKey).toHaveBeenCalledWith(testKey);
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
});
