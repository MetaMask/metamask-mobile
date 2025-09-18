import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import GetStarted from './GetStarted';
import { RampType } from '../../types';
import { RampSDK } from '../../sdk';
import useRampNetwork from '../../hooks/useRampNetwork';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import useRegions from '../../hooks/useRegions';

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.RAMP.GET_STARTED,
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

const mockUseRampNetworkInitialValue: Partial<
  ReturnType<typeof useRampNetwork>
> = [true];

let mockUseRampNetworkValue = [...mockUseRampNetworkInitialValue];

jest.mock('../../hooks/useRampNetwork', () =>
  jest.fn(() => mockUseRampNetworkValue),
);

const mockuseRampSDKInitialValues: Partial<RampSDK> = {
  getStarted: false,
  setGetStarted: jest.fn(),
  sdkError: undefined,
  selectedRegion: null,
  rampType: RampType.BUY,
  isBuy: true,
  isSell: false,
  intent: undefined,
  setIntent: jest.fn(),
};

const mockUseRegionInitialValues: Partial<ReturnType<typeof useRegions>> = {
  selectedRegion: null,
};

jest.mock('../../hooks/useRegions', () =>
  jest.fn(() => mockUseRegionInitialValues),
);

let mockUseRampSDKValues: Partial<RampSDK> = {
  ...mockuseRampSDKInitialValues,
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
  useRampSDK: () => mockUseRampSDKValues,
}));

jest.mock('../../../hooks/useAnalytics', () => () => mockTrackEvent);

describe('GetStarted', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockSetOptions.mockClear();
    mockReset.mockClear();
    mockPop.mockClear();
    mockTrackEvent.mockClear();
    (mockuseRampSDKInitialValues.setGetStarted as jest.Mock).mockClear();
  });

  beforeEach(() => {
    mockUseRampNetworkValue = [...mockUseRampNetworkInitialValue];
    mockUseRampSDKValues = {
      ...mockuseRampSDKInitialValues,
    };
    (useRegions as jest.Mock).mockReturnValue({
      ...mockUseRegionInitialValues,
    });
  });

  it('renders correctly', async () => {
    render(GetStarted);
    expect(screen.toJSON()).toMatchSnapshot();

    mockUseRampSDKValues.rampType = RampType.SELL;
    mockUseRampSDKValues.isSell = true;
    mockUseRampSDKValues.isBuy = false;
    render(GetStarted);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly when sdkError is present', async () => {
    mockUseRampSDKValues = {
      ...mockuseRampSDKInitialValues,
      sdkError: new Error('sdkError'),
    };
    render(GetStarted);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly when getStarted is true', async () => {
    mockUseRampSDKValues = {
      ...mockuseRampSDKInitialValues,
      getStarted: true,
    };
    render(GetStarted);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls setOptions when rendering', async () => {
    render(GetStarted);
    expect(mockSetOptions).toBeCalledTimes(1);
  });

  it('sets get started on button press', async () => {
    render(GetStarted);
    fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    expect(mockUseRampSDKValues.setGetStarted).toHaveBeenCalledWith(true);
  });

  it('navigates and tracks event on cancel button press', async () => {
    render(GetStarted);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockPop).toHaveBeenCalled();
    expect(mockTrackEvent).toBeCalledWith('ONRAMP_CANCELED', {
      chain_id_destination: '1',
      location: 'Get Started Screen',
    });

    mockTrackEvent.mockReset();
    mockUseRampSDKValues = {
      ...mockUseRampSDKValues,
      isBuy: false,
      isSell: true,
      rampType: RampType.SELL,
    };
    render(GetStarted);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockTrackEvent).toBeCalledWith('OFFRAMP_CANCELED', {
      chain_id_source: '1',
      location: 'Get Started Screen',
    });
  });

  it('navigates to network switcher on unsupported network when getStarted is true', async () => {
    mockUseRampSDKValues = {
      ...mockuseRampSDKInitialValues,
      getStarted: true,
    };
    mockUseRampNetworkValue = [false];
    render(GetStarted);
    expect(mockReset).toBeCalledWith({
      index: 0,
      routes: [{ name: Routes.RAMP.NETWORK_SWITCHER }],
    });
  });

  it('navigates to select region screen when getStarted is true and selectedRegion is null', async () => {
    (useRegions as jest.Mock).mockReturnValue({
      selectedRegion: null,
    });
    mockUseRampSDKValues = {
      ...mockuseRampSDKInitialValues,
      getStarted: true,
    };
    render(GetStarted);
    expect(mockReset).toBeCalledTimes(1);
    expect(mockReset).toBeCalledWith({
      index: 0,
      routes: [{ name: Routes.RAMP.REGION_HAS_STARTED }],
    });
  });

  it('navigates to build quote when getStarted is true and selectedRegion is defined', async () => {
    (useRegions as jest.Mock).mockReturnValue({
      selectedRegion: {
        id: 'us-al',
      },
    });
    mockUseRampSDKValues = {
      ...mockuseRampSDKInitialValues,
      getStarted: true,
    };
    render(GetStarted);
    expect(mockReset).toBeCalledTimes(1);
    expect(mockReset).toBeCalledWith({
      index: 0,
      routes: [
        {
          name: Routes.RAMP.BUILD_QUOTE_HAS_STARTED,
          params: {
            showBack: false,
          },
        },
      ],
    });
  });
});
