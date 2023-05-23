import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';

import GetStarted from './GetStarted';
import { Region } from '../../types';
import { OnRampSDK } from '../../sdk';
import Routes from '../../../../../constants/navigation/Routes';
import { createRegionsNavDetails } from '../Regions/Regions';

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.FIAT_ON_RAMP_AGGREGATOR.GET_STARTED,
    },
    {
      state: {
        engine: {
          backgroundState: {
            NetworkController: {
              providerConfig: { type: 'mainnet', chainId: 1 },
            },
          },
        },
      },
    },
  );
}

const mockuseFiatOnRampSDKInitialValues: Partial<OnRampSDK> = {
  getStarted: false,
  setGetStarted: jest.fn(),
  sdkError: undefined,
  selectedChainId: '1',
  selectedRegion: null,
};

let mockUseFiatOnRampSDKValues: Partial<OnRampSDK> = {
  ...mockuseFiatOnRampSDKInitialValues,
};

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockPop = jest.fn();
const mockTrackEvent = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
      reset: mockReset,
      dangerouslyGetParent: () => ({
        pop: mockPop,
      }),
    }),
  };
});

jest.mock('../../sdk', () => ({
  ...jest.requireActual('../../sdk'),
  useFiatOnRampSDK: () => mockUseFiatOnRampSDKValues,
}));

jest.mock('../../hooks/useAnalytics', () => () => mockTrackEvent);

describe('GetStarted', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockSetOptions.mockClear();
    mockReset.mockClear();
    mockPop.mockClear();
    mockTrackEvent.mockClear();
    (mockuseFiatOnRampSDKInitialValues.setGetStarted as jest.Mock).mockClear();
  });

  it('renders correctly', async () => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
    };
    render(GetStarted);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly when sdkError is present', async () => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
      sdkError: new Error('sdkError'),
    };
    render(GetStarted);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly when getStarted is true', async () => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
      getStarted: true,
    };
    render(GetStarted);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls setOptions when rendering', async () => {
    render(GetStarted);
    expect(mockSetOptions).toBeCalledTimes(1);
  });

  it('navigates on get started button press', async () => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
    };
    render(GetStarted);
    fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    expect(mockNavigate).toHaveBeenCalledWith(...createRegionsNavDetails());
    expect(mockUseFiatOnRampSDKValues.setGetStarted).toHaveBeenCalledWith(true);
  });

  it('navigates and tracks event on cancel button press', async () => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
    };
    render(GetStarted);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockPop).toHaveBeenCalled();
    expect(mockTrackEvent).toBeCalledWith('ONRAMP_CANCELED', {
      chain_id_destination: '1',
      location: 'Get Started Screen',
    });
  });

  it('navigates to select region screen when getStarted is true and selectedRegion is null', async () => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
      getStarted: true,
      selectedRegion: null,
    };
    render(GetStarted);
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
    render(GetStarted);
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
