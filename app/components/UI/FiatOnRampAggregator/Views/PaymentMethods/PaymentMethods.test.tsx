import React from 'react';
import { Country, Payment } from '@consensys/on-ramp-sdk';
import { Region } from '../../types';
import render from '../../../../../util/test/renderWithProvider';

import PaymentMethods from './PaymentMethods';
import { mockPaymentMethods } from './PaymentMethods.constants';

import { IFiatOnRampSDK } from '../../sdk';
import useRegions from '../../hooks/useRegions';
import usePaymentMethods from '../../hooks/usePaymentMethods';

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
    reset: mockReset,
  }),
}));

const mockSetSelectedRegion = jest.fn();
const mockSetSelectedPaymentMethodId = jest.fn();

const mockuseFiatOnRampSDKInitialValues: Partial<IFiatOnRampSDK> = {
  setSelectedRegion: mockSetSelectedRegion,
  setSelectedPaymentMethodId: mockSetSelectedPaymentMethodId,
  selectedPaymentMethodId: null,
  selectedChainId: '1',
  sdkError: undefined,
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
] as Partial<Country>[];

const mockuseRegionsInitialValues: Partial<ReturnType<typeof useRegions>> = {
  data: mockRegionsData as Country[],
  isFetching: false,
  error: null,
  query: mockQueryGetCountries,
  selectedRegion: mockRegionsData[0] as Region,
  unsupportedRegion: undefined,
  clearUnsupportedRegion: mockClearUnsupportedRegion,
};

let mockUseRegionsValues: Partial<ReturnType<typeof useRegions>> = {
  ...mockuseRegionsInitialValues,
};

jest.mock('../../hooks/useRegions', () => jest.fn(() => mockUseRegionsValues));

const mockQueryGetPaymentMethods = jest.fn();

const mockUsePaymentMethodsInitialValues: Partial<
  ReturnType<typeof usePaymentMethods>
> = {
  data: mockPaymentMethods as Payment[],
  isFetching: false,
  error: null,
  query: mockQueryGetPaymentMethods,
  currentPaymentMethod: mockPaymentMethods[0] as Payment,
};

let mockUsePaymentMethodsValues = {
  ...mockUsePaymentMethodsInitialValues,
};

jest.mock('../../hooks/usePaymentMethods', () =>
  jest.fn(() => mockUsePaymentMethodsValues),
);

describe('PaymentMethods View', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockSetOptions.mockClear();
    mockReset.mockClear();
  });

  beforeEach(() => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
    };
    mockUseRegionsValues = {
      ...mockuseRegionsInitialValues,
    };
    mockUsePaymentMethodsValues = {
      ...mockUsePaymentMethodsInitialValues,
    };
  });

  it.todo('renders correctly', async () => {
    const rendered = render(<PaymentMethods />);
    expect(rendered.toJSON()).toMatchSnapshot();
  });
});
