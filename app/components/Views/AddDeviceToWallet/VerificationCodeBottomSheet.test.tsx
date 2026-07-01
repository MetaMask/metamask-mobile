import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import VerificationCodeBottomSheet from './VerificationCodeBottomSheet';
import { strings } from '../../../../locales/i18n';

const mockUseRoute = jest.fn(() => ({
  params: {} as { verificationCode?: string },
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: jest.fn(),
    }),
    useRoute: () => mockUseRoute(),
  };
});

describe('VerificationCodeBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoute.mockReturnValue({ params: {} });
  });

  it('renders pending verification copy when route has no code', () => {
    const { getByText } = renderWithProvider(<VerificationCodeBottomSheet />);

    expect(
      getByText(strings('app_settings.add_device.verification_code_pending')),
    ).toBeOnTheScreen();
  });

  it('renders the OTP from route params', () => {
    mockUseRoute.mockReturnValue({ params: { verificationCode: '469192' } });

    const { getByText } = renderWithProvider(<VerificationCodeBottomSheet />);

    expect(getByText('469192')).toBeOnTheScreen();
  });

  it('does not render Done button', () => {
    const { queryByText } = renderWithProvider(<VerificationCodeBottomSheet />);

    expect(
      queryByText(strings('app_settings.add_device.done')),
    ).not.toBeOnTheScreen();
  });
});
