import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import VerificationCodeBottomSheet from './VerificationCodeBottomSheet';
import { strings } from '../../../../locales/i18n';

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);

const mockUseRoute = jest.fn(() => ({
  params: {} as { verificationCode?: string },
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
      canGoBack: mockCanGoBack,
    }),
    useRoute: () => mockUseRoute(),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockBottomSheet = ({
    children,
    goBack,
  }: {
    children: React.ReactNode;
    goBack?: () => void;
  }) =>
    ReactActual.createElement(
      View,
      { testID: 'verification-bottom-sheet', onDismissSheet: goBack },
      children,
    );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
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

  it('pops the modal route when the sheet dismisses', () => {
    const { getByTestId } = renderWithProvider(<VerificationCodeBottomSheet />);

    const sheet = getByTestId('verification-bottom-sheet');
    sheet.props.onDismissSheet();

    expect(mockCanGoBack).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
