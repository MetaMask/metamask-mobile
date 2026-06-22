import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import VerificationCodeBottomSheet from './VerificationCodeBottomSheet';
import { strings } from '../../../../locales/i18n';
import { QrSyncPhases } from '../../../core/QrSync/constants';

const mockGoBack = jest.fn();
const mockSelectQrSyncPhase = jest.fn();
const mockSelectQrSyncOtp = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../selectors/qrSyncController', () => ({
  selectQrSyncPhase: (...args: unknown[]) => mockSelectQrSyncPhase(...args),
  selectQrSyncOtp: (...args: unknown[]) => mockSelectQrSyncOtp(...args),
}));

describe('VerificationCodeBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectQrSyncPhase.mockReturnValue(QrSyncPhases.DISPLAYING_OTP);
    mockSelectQrSyncOtp.mockReturnValue('123456');
  });

  it('renders OTP from QrSyncController', () => {
    const { getByText } = renderWithProvider(<VerificationCodeBottomSheet />);

    expect(getByText('123456')).toBeOnTheScreen();
  });

  it('navigates back when Done is pressed', () => {
    const { getByText } = renderWithProvider(<VerificationCodeBottomSheet />);

    fireEvent.press(getByText(strings('app_settings.add_device.done')));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
