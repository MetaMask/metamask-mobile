import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RewardsReferralCodeTag from './RewardsReferralCodeTag';
import ClipboardManager from '../../../../../core/ClipboardManager';
import { useStyles } from '../../../../../component-library/hooks';

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn((_styleSheet, params) => ({
    styles: {
      container: {
        backgroundColor: params?.backgroundColor,
      },
      iconContainer: {},
      referralCode: {
        color: params?.fontColor,
      },
    },
  })),
}));

const mockUseStyles = useStyles as jest.MockedFunction<typeof useStyles>;

jest.mock('../../../../../core/ClipboardManager', () => ({
  setString: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

const mockToastRef = {
  current: {
    showToast: jest.fn(),
  },
};

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(() => ({
    toastRef: mockToastRef,
  })),
}));

jest.mock(
  '../../../../../images/rewards/metamask-rewards-points.svg',
  () => 'FoxRewardIcon',
);

describe('RewardsReferralCodeTag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders referral code text', () => {
    const referralCode = 'TEST123';

    const { getByText } = render(
      <RewardsReferralCodeTag referralCode={referralCode} />,
    );

    expect(getByText(referralCode)).toBeTruthy();
  });

  it('applies custom backgroundColor when provided', () => {
    const customBackgroundColor = '#FF0000';

    render(
      <RewardsReferralCodeTag
        referralCode="TEST123"
        backgroundColor={customBackgroundColor}
      />,
    );

    expect(mockUseStyles).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        backgroundColor: customBackgroundColor,
      }),
    );
  });

  it('applies custom fontColor when provided', () => {
    const customFontColor = '#00FF00';

    render(
      <RewardsReferralCodeTag
        referralCode="TEST123"
        fontColor={customFontColor}
      />,
    );

    expect(mockUseStyles).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        fontColor: customFontColor,
      }),
    );
  });

  it('passes undefined backgroundColor to useStyles when not provided', () => {
    render(<RewardsReferralCodeTag referralCode="TEST123" />);

    expect(mockUseStyles).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        backgroundColor: undefined,
      }),
    );
  });

  it('passes undefined fontColor to useStyles when not provided', () => {
    render(<RewardsReferralCodeTag referralCode="TEST123" />);

    expect(mockUseStyles).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        fontColor: undefined,
      }),
    );
  });

  it('copies referral code to clipboard when pressed', () => {
    const referralCode = 'TEST123';

    const { getByText } = render(
      <RewardsReferralCodeTag referralCode={referralCode} />,
    );

    fireEvent.press(getByText(referralCode));

    expect(ClipboardManager.setString).toHaveBeenCalledWith(referralCode);
  });

  it('shows toast when referral code is copied', () => {
    const referralCode = 'TEST123';

    const { getByText } = render(
      <RewardsReferralCodeTag referralCode={referralCode} />,
    );

    fireEvent.press(getByText(referralCode));

    expect(mockToastRef.current.showToast).toHaveBeenCalled();
  });
});
