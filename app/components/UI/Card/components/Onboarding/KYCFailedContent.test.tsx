import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import KYCFailedContent from './KYCFailedContent';

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((className?: string) => ({ className })),
  }),
}));

jest.mock(
  '../../../Ramp/Views/VirtualBankAccount/assets/vba-account-create-failure.svg',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () =>
        ReactActual.createElement(View, {
          testID: 'kyc-failed-vba-failure-svg',
        }),
    };
  },
);

describe('KYCFailedContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the not-eligible copy, illustration, and Back to home button', () => {
    const { getByTestId } = render(<KYCFailedContent onClose={jest.fn()} />);

    expect(getByTestId('kyc-failed-title')).toHaveTextContent(
      strings('card.card_onboarding.kyc_failed.title'),
    );
    expect(getByTestId('kyc-failed-description')).toHaveTextContent(
      strings('card.card_onboarding.kyc_failed.description'),
    );
    expect(getByTestId('kyc-failed-illustration')).toBeOnTheScreen();
    expect(getByTestId('kyc-failed-vba-failure-svg')).toBeOnTheScreen();
    expect(getByTestId('kyc-failed-close-button')).toHaveTextContent(
      strings('card.card_onboarding.kyc_failed.close_button'),
    );
  });

  it('calls onClose when Back to home is pressed', () => {
    const onClose = jest.fn();

    const { getByTestId } = render(<KYCFailedContent onClose={onClose} />);
    fireEvent.press(getByTestId('kyc-failed-close-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the rejection reason when one is provided', () => {
    const { getByTestId } = render(
      <KYCFailedContent
        onClose={jest.fn()}
        reasonLine="Your ID document couldn't be verified."
      />,
    );

    expect(getByTestId('kyc-failed-reason')).toHaveTextContent(
      "Your ID document couldn't be verified.",
    );
  });

  it.each([
    ['missing', undefined],
    ['null', null],
    ['an empty string', ''],
  ] as const)('omits the reason line when it is %s', (_label, reasonLine) => {
    const { queryByTestId } = render(
      <KYCFailedContent onClose={jest.fn()} reasonLine={reasonLine} />,
    );

    expect(queryByTestId('kyc-failed-reason')).not.toBeOnTheScreen();
  });
});
