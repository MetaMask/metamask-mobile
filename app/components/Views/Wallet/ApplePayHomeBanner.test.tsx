import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ApplePayHomePrompt from './ApplePayHomeBanner';

const mockHomeEligibility = {
  mode: 'provision' as 'provision' | 'sign_in',
  showSplash: false,
  showBanner: true,
  showRegionLine: false,
};

jest.mock(
  '../../UI/Card/Views/ApplePaySplash/useApplePayHomeEligibility',
  () => ({
    useApplePayHomeEligibility: () => mockHomeEligibility,
  }),
);

jest.mock(
  '../../UI/Card/Views/ApplePaySplash/usePresentApplePayHomeSplash',
  () => ({
    usePresentApplePayHomeSplash: jest.fn(),
  }),
);

jest.mock('../../UI/Card/pushProvisioning/components/AddToWalletButton', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { Pressable } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    AddToWalletButton: ({
      testID,
      buttonStyle,
    }: {
      testID?: string;
      buttonStyle?: string;
    }) =>
      ReactActual.createElement(Pressable, {
        testID,
        accessibilityHint: buttonStyle,
      }),
  };
});

describe('ApplePayHomePrompt', () => {
  beforeEach(() => {
    mockHomeEligibility.mode = 'provision';
    mockHomeEligibility.showRegionLine = false;
  });

  it('renders the native add button when the card can be provisioned', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <ApplePayHomePrompt />,
    );

    expect(getByTestId('apple-pay-home-banner-add')).toBeOnTheScreen();
    expect(queryByTestId('apple-pay-home-banner-add-row')).toBeNull();
  });

  it('uses the same outlined button as Card Home', () => {
    const { getByTestId } = renderWithProvider(<ApplePayHomePrompt />);

    expect(getByTestId('apple-pay-home-banner-add')).toHaveProp(
      'accessibilityHint',
      'blackOutline',
    );
  });

  it('renders the row selector when sign-in comes first', () => {
    mockHomeEligibility.mode = 'sign_in';
    mockHomeEligibility.showRegionLine = true;

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ApplePayHomePrompt />,
    );

    expect(getByTestId('apple-pay-home-banner-add-row')).toBeOnTheScreen();
    expect(queryByTestId('apple-pay-home-banner-add')).toBeNull();
  });
});
