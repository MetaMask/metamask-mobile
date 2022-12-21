import React from 'react';
import render from '../../../../../util/test/renderWithProvider';

import PaymentMethods from './PaymentMethods';
import { IFiatOnRampSDK } from '../../sdk';

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
  });

  it.todo('renders correctly', async () => {
    const rendered = render(<PaymentMethods />);
    expect(rendered.toJSON()).toMatchSnapshot();
  });
});
