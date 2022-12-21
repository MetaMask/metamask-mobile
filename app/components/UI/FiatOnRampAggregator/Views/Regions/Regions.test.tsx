import React from 'react';
import { Country } from '@consensys/on-ramp-sdk';
import render from '../../../../../util/test/renderWithProvider';

import Regions from './Regions';
import useRegions from '../../hooks/useRegions';
import { IFiatOnRampSDK } from '../../sdk';
import { Region } from '../../types';
import { TEST_ID_CONTINUE_BUTTON } from './Regions.constants';
import { fireEvent } from '@testing-library/react-native';
import { createPaymentMethodsNavDetails } from '../PaymentMethods/PaymentMethods';

const mockSetSelectedRegion = jest.fn();
const mockSetSelectedCurrency = jest.fn();

const mockuseFiatOnRampSDKInitialValues: Partial<IFiatOnRampSDK> = {
  setSelectedRegion: mockSetSelectedRegion,
  setSelectedFiatCurrencyId: mockSetSelectedCurrency,
  sdkError: undefined,
  selectedChainId: '1',
};

let mockUseFiatOnRampSDKValues: Partial<IFiatOnRampSDK> = {
  ...mockuseFiatOnRampSDKInitialValues,
};

jest.mock('../../sdk', () => ({
  ...jest.requireActual('../../sdk'),
  useFiatOnRampSDK: () => mockUseFiatOnRampSDKValues,
}));

const mockQueryGetCountries = jest.fn();
const mockClearUnsupportedRegion = jest.fn();

const mockRegionsData = [
  {
    currencies: ['/currencies/fiat/clp'],
    emoji: '🇨🇱',
    id: '/regions/cl',
    name: 'Chile',
    unsupported: false,
  },
  {
    currencies: ['/currencies/fiat/ars'],
    emoji: '🇦🇷',
    id: '/regions/ar',
    name: 'Argentina',
    unsupported: false,
  },
] as Partial<Country>[];

const mockuseRegionsInitialValues: Partial<ReturnType<typeof useRegions>> = {
  data: mockRegionsData as Country[],
  isFetching: false,
  error: null,
  query: mockQueryGetCountries,
  selectedRegion: null,
  unsupportedRegion: undefined,
  clearUnsupportedRegion: mockClearUnsupportedRegion,
};

let mockUseRegionsValues: Partial<ReturnType<typeof useRegions>> = {
  ...mockuseRegionsInitialValues,
};

jest.mock('../../hooks/useRegions', () => jest.fn(() => mockUseRegionsValues));

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
  }),
}));

describe('Regions View', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockSetOptions.mockClear();
    (
      mockuseFiatOnRampSDKInitialValues.setSelectedRegion as jest.Mock
    ).mockClear();
    (
      mockuseFiatOnRampSDKInitialValues.setSelectedFiatCurrencyId as jest.Mock
    ).mockClear();
  });

  beforeEach(() => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
    };
    mockUseRegionsValues = {
      ...mockuseRegionsInitialValues,
    };
  });

  it('renders correctly', async () => {
    const rendered = render(<Regions />);
    expect(rendered.toJSON()).toMatchSnapshot();
  });

  it('renders correctly while loading', async () => {
    mockUseRegionsValues = {
      ...mockuseRegionsInitialValues,
      isFetching: true,
    };
    const rendered = render(<Regions />);
    expect(rendered.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with no data', async () => {
    mockUseRegionsValues = {
      ...mockuseRegionsInitialValues,
      data: null,
    };
    const rendered = render(<Regions />);
    expect(rendered.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with selectedRegion', async () => {
    mockUseRegionsValues = {
      ...mockuseRegionsInitialValues,
      selectedRegion: mockRegionsData[0] as Country,
    };
    const rendered = render(<Regions />);
    expect(rendered.toJSON()).toMatchSnapshot();
  });

  it('renders regions modal when pressing select button', async () => {
    const rendered = render(<Regions />);
    const selectRegionButton = rendered.getByRole('button', {
      name: 'Select your region',
    });
    fireEvent.press(selectRegionButton);
    expect(rendered.toJSON()).toMatchSnapshot();
  });

  it('calls setSelectedRegion when pressing a region', async () => {
    const rendered = render(<Regions />);
    const regionToPress = mockRegionsData[0] as Region;
    const regionButton = rendered.getByRole('button', {
      name: regionToPress.name,
    });
    fireEvent.press(regionButton);
    expect(mockSetSelectedRegion).toHaveBeenCalledWith(regionToPress);
  });

  it('navigates on continue press', async () => {
    mockUseRegionsValues = {
      ...mockuseRegionsInitialValues,
      selectedRegion: mockRegionsData[0] as Country,
    };
    const rendered = render(<Regions />);
    fireEvent.press(rendered.getByTestId(TEST_ID_CONTINUE_BUTTON));
    expect(mockNavigate).toHaveBeenCalledWith(
      ...createPaymentMethodsNavDetails(),
    );
  });

  it('has continue button disabled', async () => {
    const rendered = render(<Regions />);
    const continueButton = rendered.getByTestId(TEST_ID_CONTINUE_BUTTON);
    expect(continueButton.props.disabled).toBe(true);
  });

  it('renders correctly with unsupportedRegion', async () => {
    mockUseRegionsValues = {
      ...mockuseRegionsInitialValues,
      unsupportedRegion: mockRegionsData[1] as Region,
    };
    const rendered = render(<Regions />);
    expect(rendered.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with sdkError', async () => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
      sdkError: new Error('sdkError'),
    };
    mockUseRegionsValues = {
      ...mockuseRegionsInitialValues,
    };
    const rendered = render(<Regions />);
    expect(rendered.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with error', async () => {
    mockUseRegionsValues = {
      ...mockuseRegionsInitialValues,
      error: 'Test error',
    };
    const rendered = render(<Regions />);
    expect(rendered.toJSON()).toMatchSnapshot();
  });

  it('calls setOptions when rendering', async () => {
    render(<Regions />);
    expect(mockSetOptions).toBeCalledTimes(1);
  });
});
