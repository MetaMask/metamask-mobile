import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import UnsupportedStateModal from './UnsupportedStateModal';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import { createBuyNavigationDetails } from '../../../../Aggregator/routes/utils.ts';
import { createStateSelectorModalNavigationDetails } from '../StateSelectorModal/StateSelectorModal.tsx';
import Routes from '../../../../../../../constants/navigation/Routes';

const mockUseDepositSDK = jest.fn();
const mockNavigate = jest.fn();
const mockDangerouslyGetParent = jest.fn();
const mockPop = jest.fn();
const mockGoBack = jest.fn();
const mockOnStateSelect = jest.fn();

const mockSelectedRegion = {
  isoCode: 'US',
  flag: '🇺🇸',
  name: 'United States',
  phone: {
    prefix: '+1',
    placeholder: '(555) 123-4567',
    template: '(XXX) XXX-XXXX',
  },
  currency: 'USD',
  supported: true,
};

jest.mock('../../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
      dangerouslyGetParent: mockDangerouslyGetParent,
    }),
  };
});

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => ({
    stateCode: 'NY',
    stateName: 'New York',
    onStateSelect: mockOnStateSelect,
  })),
}));

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE,
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

describe('UnsupportedStateModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDangerouslyGetParent.mockReturnValue({
      pop: mockPop,
    });
  });

  it('render match snapshot', () => {
    mockUseDepositSDK.mockReturnValue({
      selectedRegion: mockSelectedRegion,
    });

    const { toJSON } = render(UnsupportedStateModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('handles try another option button press correctly', () => {
    mockUseDepositSDK.mockReturnValue({
      selectedRegion: mockSelectedRegion,
      onStateSelect: jest.fn(),
    });

    const { getByText } = render(UnsupportedStateModal);

    const tryAnotherOptionButton = getByText('Try another option');
    fireEvent.press(tryAnotherOptionButton);

    expect(mockDangerouslyGetParent).toHaveBeenCalled();
    expect(mockPop).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(...createBuyNavigationDetails());
  });

  it('handles select different state button press correctly', () => {
    mockUseDepositSDK.mockReturnValue({
      selectedRegion: mockSelectedRegion,
    });

    const { getByText } = render(UnsupportedStateModal);

    const changeStateButton = getByText('Change region');
    fireEvent.press(changeStateButton);

    expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
      screen: 'DepositStateSelectorModal',
      params: {
        selectedState: 'NY',
        onStateSelect: mockOnStateSelect,
      },
    });
  });
});
