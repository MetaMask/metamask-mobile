import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderDepositTestComponent from '../../../utils/renderDepositTestComponent';
import UnsupportedStateModal from './UnsupportedStateModal';
import Routes from '../../../../../../../constants/navigation/Routes';

const mockUseDepositSDK = jest.fn();
const mockNavigate = jest.fn();
const mockDangerouslyGetParent = jest.fn();
const mockPop = jest.fn();
const mockGoBack = jest.fn();
const mockOnStateSelect = jest.fn();

jest.mock('../../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
  DepositSDKProvider: ({ children }: { children: React.ReactNode }) => children,
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
  createNavigationDetails: jest.fn(),
  useParams: jest.fn(() => ({})),
}));

jest.mock('../StateSelectorModal', () => ({
  createStateSelectorModalNavigationDetails: jest.fn((params) => [
    'StateSelectorModal',
    params,
  ]),
}));

jest.mock('../../../../Aggregator/routes/utils', () => ({
  createBuyNavigationDetails: jest.fn(() => ['BuyScreen']),
}));

describe('UnsupportedStateModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDangerouslyGetParent.mockReturnValue({
      pop: mockPop,
    });

    // Mock useParams to return default values including onStateSelect
    const { useParams } = jest.requireMock(
      '../../../../../../../util/navigation/navUtils',
    );
    useParams.mockReturnValue({
      stateCode: undefined,
      stateName: undefined,
      onStateSelect: mockOnStateSelect,
    });
  });

  it('render match snapshot', () => {
    mockUseDepositSDK.mockReturnValue({
      selectedRegion: {
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
      },
    });

    const { toJSON } = renderDepositTestComponent(
      UnsupportedStateModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays change state button', () => {
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

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: mockSelectedRegion,
    });

    const { getByText } = renderDepositTestComponent(
      UnsupportedStateModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE,
    );

    expect(getByText('Change region')).toBeOnTheScreen();
  });

  it('displays try another option button', () => {
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

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: mockSelectedRegion,
    });

    const { getByText } = renderDepositTestComponent(
      UnsupportedStateModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE,
    );

    expect(getByText('Try another option')).toBeOnTheScreen();
  });

  it('displays region flag and name', () => {
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

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: mockSelectedRegion,
    });

    const { getByText } = renderDepositTestComponent(
      UnsupportedStateModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE,
    );

    expect(getByText('🇺🇸')).toBeOnTheScreen();
    expect(getByText('United States')).toBeOnTheScreen();
  });

  it('handles missing region gracefully', () => {
    mockUseDepositSDK.mockReturnValue({
      selectedRegion: null,
    });

    const { toJSON } = renderDepositTestComponent(
      UnsupportedStateModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('displays state name from params when available', () => {
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

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: mockSelectedRegion,
    });

    // Mock useParams to return stateName and onStateSelect
    const { useParams } = jest.requireMock(
      '../../../../../../../util/navigation/navUtils',
    );
    useParams.mockReturnValue({
      stateCode: 'CA',
      stateName: 'California',
      onStateSelect: mockOnStateSelect,
    });

    const { getByText } = renderDepositTestComponent(
      UnsupportedStateModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE,
    );

    expect(getByText('California')).toBeOnTheScreen();
  });

  it('displays region name when state name is not provided', () => {
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

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: mockSelectedRegion,
    });

    // Mock useParams to return only stateCode and onStateSelect
    const { useParams } = jest.requireMock(
      '../../../../../../../util/navigation/navUtils',
    );
    useParams.mockReturnValue({
      stateCode: 'CA',
      onStateSelect: mockOnStateSelect,
    });

    const { getByText } = renderDepositTestComponent(
      UnsupportedStateModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE,
    );

    expect(getByText('United States')).toBeOnTheScreen();
  });

  it('handles try another option button press correctly', () => {
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

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: mockSelectedRegion,
    });

    const { getByText } = renderDepositTestComponent(
      UnsupportedStateModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE,
    );

    const tryAnotherOptionButton = getByText('Try another option');
    fireEvent.press(tryAnotherOptionButton);

    expect(mockDangerouslyGetParent).toHaveBeenCalled();
    expect(mockPop).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('BuyScreen');
  });

  it('handles select different state button press correctly', () => {
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

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: mockSelectedRegion,
    });

    // Mock useParams to return stateCode and onStateSelect
    const { useParams } = jest.requireMock(
      '../../../../../../../util/navigation/navUtils',
    );
    useParams.mockReturnValue({
      stateCode: 'NY',
      stateName: 'New York',
      onStateSelect: mockOnStateSelect,
    });

    const { getByText } = renderDepositTestComponent(
      UnsupportedStateModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE,
    );

    const changeStateButton = getByText('Change region');
    fireEvent.press(changeStateButton);

    expect(mockNavigate).toHaveBeenCalledWith('StateSelectorModal', {
      selectedState: 'NY',
      onStateSelect: mockOnStateSelect,
    });
  });

  it('passes onStateSelect callback to StateSelectorModal', () => {
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

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: mockSelectedRegion,
    });

    // Mock useParams to return onStateSelect
    const { useParams } = jest.requireMock(
      '../../../../../../../util/navigation/navUtils',
    );
    useParams.mockReturnValue({
      stateCode: 'TX',
      stateName: 'Texas',
      onStateSelect: mockOnStateSelect,
    });

    const { getByText } = renderDepositTestComponent(
      UnsupportedStateModal,
      Routes.DEPOSIT.MODALS.UNSUPPORTED_STATE,
    );

    const changeStateButton = getByText('Change region');
    fireEvent.press(changeStateButton);

    // Verify that the onStateSelect callback is passed to StateSelectorModal
    expect(mockNavigate).toHaveBeenCalledWith('StateSelectorModal', {
      selectedState: 'TX',
      onStateSelect: mockOnStateSelect,
    });
  });
});
