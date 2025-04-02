import React from 'react';
import CustomAction from './CustomAction';
import { PaymentCustomAction } from '@consensys/on-ramp-sdk/dist/API';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { selectIpfsGateway } from '../../../../../selectors/preferencesController';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Quote from '../Quote';
import { RampType } from '../../../../../reducers/fiatOrders/types';
import { fireEvent } from '@testing-library/react-native';
// Mock the selectIpfsGateway selector
jest.mock('../../../../../selectors/preferencesController', () => ({
  ...jest.requireActual('../../../../../selectors/preferencesController'),
  selectIpfsGateway: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
(selectIpfsGateway as unknown as jest.Mock).mockReturnValue(
  'https://mock-ipfs-gateway.com',
);

const mockCustomAction: PaymentCustomAction = {
  buy: {
    providerId: '/providers/paypal-staging',
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    provider: {
      description: 'Per Paypal: [Paypal Description]',
      environmentType: 'STAGING',
      hqAddress: '123 PayPal Staging Address',
      id: '/providers/paypal-staging',
      logos: {
        dark: 'https://on-ramp.dev-api.cx.metamask.io/assets/providers/paypal_dark.png',
        height: 24,
        light:
          'https://on-ramp.dev-api.cx.metamask.io/assets/providers/paypal_light.png',
        width: 65,
      },
      name: 'Paypal (Staging)',
    },
  },
  supportedPaymentMethodIds: ['/payments/paypal', '/payments/paypal-staging'],
  paymentMethodId: '/payments/paypal',
};

const defaultState = {
  engine: {
    backgroundState,
  },
};

describe('CustomAction Component', () => {
  it('renders correctly with a custom action', () => {
    const { getByText } = renderWithProvider(
      <CustomAction customAction={mockCustomAction} showInfo={jest.fn()} />,
      { state: defaultState },
    );

    expect(getByText('Continue with Paypal (Staging)')).toBeTruthy();
  });

  it('calls onPress when not highlighted and pressed', () => {
    const onPressMock = jest.fn();
    const { getByLabelText } = renderWithProvider(
      <CustomAction
        customAction={mockCustomAction}
        showInfo={jest.fn()}
        onPress={onPressMock}
      />,
      { state: defaultState },
    );

    fireEvent.press(getByLabelText('Paypal (Staging)'));
    expect(onPressMock).toHaveBeenCalled();
  });

  it('shows loading indicator when isLoading is true', () => {
    const { getByTestId } = renderWithProvider(
      <CustomAction
        customAction={mockCustomAction}
        showInfo={jest.fn()}
        isLoading
      />,
      { state: defaultState },
    );

    expect(getByTestId('buy-button-loading')).toBeTruthy();
  });

  it('displays previously used provider tag', () => {
    const { getByText } = renderWithProvider(
      <CustomAction
        customAction={mockCustomAction}
        previouslyUsedProvider
        showInfo={jest.fn()}
      />,
      { state: defaultState },
    );

    expect(getByText('Previously used')).toBeTruthy();
  });

  it('calls onPressCTA when CTA button is pressed', () => {
    const onPressCTAMock = jest.fn();
    const { getByText } = renderWithProvider(
      <CustomAction
        customAction={mockCustomAction}
        onPressCTA={onPressCTAMock}
        showInfo={jest.fn()}
      />,
      { state: defaultState },
    );

    fireEvent.press(getByText('Continue with Paypal (Staging)'));
    expect(onPressCTAMock).toHaveBeenCalled();
  });
});
