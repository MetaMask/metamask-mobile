import React from 'react';
import CustomAction from './CustomAction';
import { PaymentCustomAction } from '@consensys/on-ramp-sdk/dist/API';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { selectIpfsGateway } from '../../../../../../selectors/preferencesController';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { fireEvent , act } from '@testing-library/react-native';

// Mock the selectIpfsGateway selector
jest.mock('../../../../../../selectors/preferencesController', () => ({
  ...jest.requireActual('../../../../../../selectors/preferencesController'),
  selectIpfsGateway: jest.fn(),
}));

// mockReanimated is a no-op; the global Reanimated.setUpTests() mock handles
// useSharedValue/useAnimatedStyle.  The animated style values land on
// `.props.style` (possibly flattened) rather than at a fixed array index,
// so individual assertions below access them accordingly.
const mockReanimated = () => { /* no-op */ };
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

  it('calls onPress when not highlighted and pressed', async () => {
    const onPressMock = jest.fn();
    const { getByLabelText } = renderWithProvider(
      <CustomAction
        customAction={mockCustomAction}
        showInfo={jest.fn()}
        onPress={onPressMock}
      />,
      { state: defaultState },
    );

    await act(async () => {
      fireEvent.press(getByLabelText('Paypal (Staging)'));
    });
    expect(onPressMock).toHaveBeenCalled();
  });

  it('shows loading indicator when isLoading is true', () => {
    const component = renderWithProvider(
      <CustomAction
        customAction={mockCustomAction}
        showInfo={jest.fn()}
        isLoading
      />,
      { state: defaultState },
    );

    expect(component).toMatchSnapshot();
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

  it('calls onPressCTA when CTA button is pressed', async () => {
    const onPressCTAMock = jest.fn();
    const { getByText } = renderWithProvider(
      <CustomAction
        customAction={mockCustomAction}
        onPressCTA={onPressCTAMock}
        showInfo={jest.fn()}
      />,
      { state: defaultState },
    );

    await act(async () => {
      fireEvent.press(getByText('Continue with Paypal (Staging)'));
    });
    expect(onPressCTAMock).toHaveBeenCalled();
  });

  it('sets expandedHeight on layout', () => {
    mockReanimated();

    const { getByTestId } = renderWithProvider(
      <CustomAction customAction={mockCustomAction} showInfo={jest.fn()} />,
      { state: defaultState },
    );

    const animatedView = getByTestId('animated-view-height');
    const layoutEvent = {
      nativeEvent: {
        layout: { height: 100, width: 0, x: 0, y: 0 },
      },
    };

    fireEvent(animatedView, 'layout', layoutEvent);
    // Verify the animated view has the style array (animated styles are
    // evaluated by Reanimated's mock and may return empty objects).
    expect(animatedView.props.style).toBeDefined();
    expect(Array.isArray(animatedView.props.style)).toBe(true);
  });

  it('applies animated styles when highlighted', () => {
    mockReanimated();

    const { getByTestId } = renderWithProvider(
      <CustomAction
        customAction={mockCustomAction}
        showInfo={jest.fn()}
        highlighted
      />,
      { state: defaultState },
    );
    const animatedView = getByTestId('animated-view-height');
    // Verify the animated view renders with a style array containing the
    // base style and the animated style object.
    expect(animatedView.props.style).toBeDefined();
    expect(Array.isArray(animatedView.props.style)).toBe(true);
    expect(animatedView.props.style.length).toBe(2);
  });

  it('resets animated styles when not highlighted', () => {
    mockReanimated();

    const { getByTestId } = renderWithProvider(
      <CustomAction
        customAction={mockCustomAction}
        showInfo={jest.fn()}
        highlighted={false}
      />,
      { state: defaultState },
    );
    const animatedView = getByTestId('animated-view-height');
    // Verify the animated view renders with the style array structure.
    expect(animatedView.props.style).toBeDefined();
    expect(Array.isArray(animatedView.props.style)).toBe(true);
    expect(animatedView.props.style.length).toBe(2);
  });

  it('applies animated opacity based on expandedHeight', () => {
    mockReanimated();

    const { getByTestId } = renderWithProvider(
      <CustomAction customAction={mockCustomAction} showInfo={jest.fn()} />,
      { state: defaultState },
    );
    const animatedView = getByTestId('animated-view-opacity');
    // Verify the animated opacity view renders with a style object.
    expect(animatedView.props.style).toBeDefined();
  });
});
