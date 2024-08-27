import React from 'react';
import { Country, Payment } from '@consensys/on-ramp-sdk';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';

import PaymentMethods from './PaymentMethods';
import { mockPaymentMethods } from './PaymentMethods.constants';
import { createBuildQuoteNavDetails } from '../BuildQuote/BuildQuote';

import useRegions from '../../hooks/useRegions';
import usePaymentMethods from '../../hooks/usePaymentMethods';
import { RampType, Region } from '../../types';
import { RampSDK } from '../../sdk';
import Routes from '../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../util/test/initial-root-state';

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.RAMP.PAYMENT_METHOD,
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

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
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
      goBack: mockGoBack,
      reset: mockReset,
      dangerouslyGetParent: () => ({
        pop: mockPop,
      }),
    }),
  };
});

const mockSetSelectedRegion = jest.fn();
const mockSetSelectedPaymentMethodId = jest.fn();

const mockUseRampSDKInitialValues: Partial<RampSDK> = {
  setSelectedRegion: mockSetSelectedRegion,
  setSelectedPaymentMethodId: mockSetSelectedPaymentMethodId,
  selectedChainId: '1',
  sdkError: undefined,
  rampType: RampType.BUY,
  isBuy: true,
  isSell: false,
};

let mockUseRampSDKValues: Partial<RampSDK> = {
  ...mockUseRampSDKInitialValues,
};

jest.mock('../../sdk', () => ({
  ...jest.requireActual('../../sdk'),
  useRampSDK: () => mockUseRampSDKValues,
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

let mockUseParamsValues: {
  showBack?: boolean;
} = {
  showBack: undefined,
};

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

jest.mock('../../hooks/useAnalytics', () => () => mockTrackEvent);

describe('PaymentMethods View', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSetOptions.mockClear();
    mockReset.mockClear();
    mockPop.mockClear();
    mockTrackEvent.mockClear();
  });

  beforeEach(() => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
    };
    mockUseRegionsValues = {
      ...mockuseRegionsInitialValues,
    };
    mockUsePaymentMethodsValues = {
      ...mockUsePaymentMethodsInitialValues,
    };
    mockUseParamsValues = {
      showBack: undefined,
    };
  });

  it('calls setOptions when rendering', async () => {
    render(PaymentMethods);
    expect(mockSetOptions).toBeCalledTimes(1);
  });

  it('renders correctly', async () => {
    render(PaymentMethods);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly for sell', async () => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      isBuy: false,
      isSell: true,
      rampType: RampType.SELL,
    };
    render(PaymentMethods);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with show back button false', async () => {
    mockUseParamsValues = {
      showBack: false,
    };
    render(PaymentMethods);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly while loading', async () => {
    mockUsePaymentMethodsValues = {
      ...mockUsePaymentMethodsInitialValues,
      isFetching: true,
    };
    render(PaymentMethods);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with null data', async () => {
    mockUsePaymentMethodsValues = {
      ...mockUsePaymentMethodsInitialValues,
      data: null,
    };
    render(PaymentMethods);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with empty data', async () => {
    mockUsePaymentMethodsValues = {
      ...mockUsePaymentMethodsInitialValues,
      data: [],
    };
    render(PaymentMethods);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with empty data for sell', async () => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      isBuy: false,
      isSell: true,
      rampType: RampType.SELL,
    };
    mockUsePaymentMethodsValues = {
      ...mockUsePaymentMethodsInitialValues,
      data: [],
    };
    render(PaymentMethods);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with payment method with disclaimer', async () => {
    mockUsePaymentMethodsValues = {
      ...mockUsePaymentMethodsInitialValues,
      currentPaymentMethod: mockPaymentMethods[1] as Payment,
    };
    render(PaymentMethods);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('resets region and payment method id when pressing error view with empty data', async () => {
    mockUsePaymentMethodsValues = {
      ...mockUsePaymentMethodsInitialValues,
      data: [],
    };
    render(PaymentMethods);
    fireEvent.press(screen.getByRole('button', { name: 'Reset Region' }));
    expect(mockSetSelectedRegion).toBeCalledWith(null);
    expect(mockSetSelectedPaymentMethodId).toBeCalledWith(null);
  });

  it('navigates back when pressing error view with empty data and back button is visible', async () => {
    mockUsePaymentMethodsValues = {
      ...mockUsePaymentMethodsInitialValues,
      data: [],
    };
    render(PaymentMethods);
    fireEvent.press(screen.getByRole('button', { name: 'Reset Region' }));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('resets navigation when pressing error view with empty data and back button is not visible', async () => {
    mockUseParamsValues = {
      showBack: false,
    };
    mockUsePaymentMethodsValues = {
      ...mockUsePaymentMethodsInitialValues,
      data: [],
    };
    render(PaymentMethods);
    fireEvent.press(screen.getByRole('button', { name: 'Reset Region' }));
    expect(mockReset).toBeCalledWith({
      routes: [{ name: Routes.RAMP.REGION }],
    });
  });

  it('navigates and tracks event on cancel button press', async () => {
    render(PaymentMethods);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockPop).toHaveBeenCalled();
    expect(mockTrackEvent).toBeCalledWith('ONRAMP_CANCELED', {
      chain_id_destination: '1',
      location: 'Payment Method Screen',
    });

    mockTrackEvent.mockReset();
    mockUseRampSDKValues = {
      ...mockUseRampSDKValues,
      isBuy: false,
      isSell: true,
      rampType: RampType.SELL,
    };
    render(PaymentMethods);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockTrackEvent).toBeCalledWith('OFFRAMP_CANCELED', {
      chain_id_source: '1',
      location: 'Payment Method Screen',
    });
  });

  it('selects payment method on press', async () => {
    render(PaymentMethods);
    fireEvent.press(screen.getByRole('button', { name: 'Debit or Credit' }));
    expect(mockSetSelectedPaymentMethodId).toBeCalledWith(
      '/payments/debit-credit-card',
    );

    expect(mockTrackEvent.mock.lastCall).toMatchInlineSnapshot(`
      [
        "ONRAMP_PAYMENT_METHOD_SELECTED",
        {
          "available_payment_method_ids": [
            "/payments/instant-bank-transfer",
            "/payments/apple-pay",
            "/payments/debit-credit-card",
          ],
          "location": "Payment Method Screen",
          "payment_method_id": "/payments/debit-credit-card",
          "region": "/regions/cl",
        },
      ]
    `);

    mockTrackEvent.mockReset();
    mockUseRampSDKValues = {
      ...mockUseRampSDKValues,
      isBuy: false,
      isSell: true,
      rampType: RampType.SELL,
    };
    render(PaymentMethods);
    fireEvent.press(screen.getByRole('button', { name: 'Debit or Credit' }));
    expect(mockTrackEvent.mock.lastCall).toMatchInlineSnapshot(`
      [
        "OFFRAMP_PAYMENT_METHOD_SELECTED",
        {
          "available_payment_method_ids": [
            "/payments/instant-bank-transfer",
            "/payments/apple-pay",
            "/payments/debit-credit-card",
          ],
          "location": "Payment Method Screen",
          "payment_method_id": "/payments/debit-credit-card",
          "region": "/regions/cl",
        },
      ]
    `);
  });

  it('navigates to amount to buy on continue button press', async () => {
    render(PaymentMethods);
    fireEvent.press(screen.getByRole('button', { name: 'Continue to amount' }));
    expect(mockNavigate).toHaveBeenCalledWith(...createBuildQuoteNavDetails());
    expect(mockTrackEvent.mock.lastCall).toMatchInlineSnapshot(`
      [
        "ONRAMP_CONTINUE_TO_AMOUNT_CLICKED",
        {
          "available_payment_method_ids": [
            "/payments/instant-bank-transfer",
            "/payments/apple-pay",
            "/payments/debit-credit-card",
          ],
          "location": "Payment Method Screen",
          "payment_method_id": "/payments/instant-bank-transfer",
          "region": "/regions/cl",
        },
      ]
    `);

    mockTrackEvent.mockReset();
    mockUseRampSDKValues = {
      ...mockUseRampSDKValues,
      isBuy: false,
      isSell: true,
      rampType: RampType.SELL,
    };
    render(PaymentMethods);
    fireEvent.press(screen.getByRole('button', { name: 'Continue to amount' }));
    expect(mockTrackEvent.mock.lastCall).toMatchInlineSnapshot(`
      [
        "OFFRAMP_CONTINUE_TO_AMOUNT_CLICKED",
        {
          "available_payment_method_ids": [
            "/payments/instant-bank-transfer",
            "/payments/apple-pay",
            "/payments/debit-credit-card",
          ],
          "location": "Payment Method Screen",
          "payment_method_id": "/payments/instant-bank-transfer",
          "region": "/regions/cl",
        },
      ]
    `);
  });

  it('renders correctly with sdkError', async () => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      sdkError: new Error('sdkError'),
    };
    render(PaymentMethods);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('navigates to home when clicking sdKError button', async () => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      sdkError: new Error('sdkError'),
    };
    render(PaymentMethods);
    fireEvent.press(
      screen.getByRole('button', { name: 'Return to Home Screen' }),
    );
    expect(mockPop).toBeCalledTimes(1);
  });

  it('renders correctly with error', async () => {
    mockUsePaymentMethodsValues = {
      ...mockUsePaymentMethodsInitialValues,
      error: 'Test error',
    };
    render(PaymentMethods);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('queries payment methods again with error', async () => {
    mockUsePaymentMethodsValues = {
      ...mockUsePaymentMethodsInitialValues,
      error: 'Test error',
    };
    render(PaymentMethods);
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockQueryGetPaymentMethods).toBeCalledTimes(1);
  });
});
