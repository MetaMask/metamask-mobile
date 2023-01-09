import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import render from '../../../../../util/test/renderWithProvider';

import GetStarted from './GetStarted';
import { TEST_ID_GET_STARTED_BUTTON } from './GetStarted.constants';
import { Region } from '../../types';
import { IFiatOnRampSDK } from '../../sdk';
import Routes from '../../../../../constants/navigation/Routes';
import { createRegionsNavDetails } from '../Regions/Regions';

const mockuseFiatOnRampSDKInitialValues: Partial<IFiatOnRampSDK> = {
  getStarted: false,
  setGetStarted: jest.fn(),
  sdkError: undefined,
  selectedChainId: '1',
  selectedRegion: null,
};

let mockUseFiatOnRampSDKValues: Partial<IFiatOnRampSDK> = {
  ...mockuseFiatOnRampSDKInitialValues,
};

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

jest.mock('../../sdk', () => ({
  ...jest.requireActual('../../sdk'),
  useFiatOnRampSDK: () => mockUseFiatOnRampSDKValues,
}));

describe('GetStarted', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockSetOptions.mockClear();
    mockReset.mockClear();
    (mockuseFiatOnRampSDKInitialValues.setGetStarted as jest.Mock).mockClear();
  });

  it('renders correctly', async () => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
    };
    const rendered = render(<GetStarted />);
    expect(rendered.toJSON()).toMatchSnapshot();
  });

  it('renders correctly when sdkError is present', async () => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
      sdkError: new Error('sdkError'),
    };
    const rendered = render(<GetStarted />);
    expect(rendered.toJSON()).toMatchSnapshot();
  });

  it('renders correctly when getStarted is true', async () => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
      getStarted: true,
    };
    const rendered = render(<GetStarted />);
    expect(rendered.toJSON()).toMatchSnapshot();
  });

  it('calls setOptions when rendering', async () => {
    render(<GetStarted />);
    expect(mockSetOptions).toBeCalledTimes(1);
  });

  it('navigates on button press', async () => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
    };
    const rendered = render(<GetStarted />);
    fireEvent.press(rendered.getByTestId(TEST_ID_GET_STARTED_BUTTON));
    expect(mockNavigate).toHaveBeenCalledWith(...createRegionsNavDetails());
    expect(mockUseFiatOnRampSDKValues.setGetStarted).toHaveBeenCalledWith(true);
  });

  it('navigates to select region screen when getStarted is true and selectedRegion is null', async () => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
      getStarted: true,
      selectedRegion: null,
    };
    render(<GetStarted />);
    expect(mockReset).toBeCalledTimes(1);
    expect(mockReset).toBeCalledWith({
      index: 0,
      routes: [{ name: Routes.FIAT_ON_RAMP_AGGREGATOR.REGION_HAS_STARTED }],
    });
  });

  it('navigates to payment method when getStarted is true and selectedRegion is defined', async () => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
      getStarted: true,
      selectedRegion: {
        id: 'us-al',
      } as Region,
    };
    render(<GetStarted />);
    expect(mockReset).toBeCalledTimes(1);
    expect(mockReset).toBeCalledWith({
      index: 0,
      routes: [
        {
          name: Routes.FIAT_ON_RAMP_AGGREGATOR.PAYMENT_METHOD_HAS_STARTED,
          params: {
            showBack: false,
          },
        },
      ],
    });
  });
});
