import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import type { MoneyMfaStatus } from '../../hooks/useMoneyMfa';
import MoneyMfaStatusBanner from './MoneyMfaStatusBanner';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';

const renderBanner = (status: MoneyMfaStatus, isSettingUpDismissed = false) => {
  const onRetry = jest.fn();
  const onDismissSettingUp = jest.fn();
  const utils = render(
    <MoneyMfaStatusBanner
      status={status}
      isSettingUpDismissed={isSettingUpDismissed}
      onDismissSettingUp={onDismissSettingUp}
      onRetry={onRetry}
    />,
  );
  return { ...utils, onRetry, onDismissSettingUp };
};

describe('MoneyMfaStatusBanner', () => {
  let announce: jest.SpyInstance;

  beforeEach(() => {
    announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    announce.mockRestore();
  });

  describe('setting_up', () => {
    it('renders the setting up copy without a retry button', () => {
      const { getByTestId, getByText, queryByTestId } =
        renderBanner('setting_up');

      expect(getByTestId(MoneyMfaTestIds.SETTING_UP_BANNER)).toBeOnTheScreen();
      expect(
        getByText(strings('money.mfa.setting_up_title')),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('money.mfa.setting_up_description')),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyMfaTestIds.FAILED_BANNER_RETRY),
      ).not.toBeOnTheScreen();
    });

    it('calls onDismissSettingUp when close is pressed', () => {
      const { getByTestId, onDismissSettingUp } = renderBanner('setting_up');

      fireEvent.press(getByTestId(MoneyMfaTestIds.SETTING_UP_BANNER_CLOSE));

      expect(onDismissSettingUp).toHaveBeenCalledTimes(1);
    });

    it('labels the close button Dismiss and announces the banner', () => {
      const { getByLabelText } = renderBanner('setting_up');

      expect(getByLabelText(strings('money.mfa.dismiss'))).toBeOnTheScreen();
      expect(announce).toHaveBeenCalledWith(
        strings('money.mfa.setting_up_title'),
      );
    });

    it('renders nothing once the user closed it', () => {
      const { toJSON } = renderBanner('setting_up', true);

      expect(toJSON()).toBeNull();
    });
  });

  describe('failed', () => {
    it('renders the failed copy', () => {
      const { getByTestId, getByText } = renderBanner('failed');

      expect(getByTestId(MoneyMfaTestIds.FAILED_BANNER)).toBeOnTheScreen();
      expect(getByText(strings('money.mfa.failed_title'))).toBeOnTheScreen();
      expect(
        getByText(strings('money.mfa.failed_description')),
      ).toBeOnTheScreen();
      expect(announce).toHaveBeenCalledWith(strings('money.mfa.failed_title'));
    });

    it('offers Try again as its own link', () => {
      const { getByTestId } = renderBanner('failed');

      expect(getByTestId(MoneyMfaTestIds.FAILED_BANNER_RETRY)).toHaveProp(
        'accessibilityRole',
        'link',
      );
    });

    it('calls onRetry when Try again is pressed', () => {
      const { getByTestId, onRetry } = renderBanner('failed');

      fireEvent.press(getByTestId(MoneyMfaTestIds.FAILED_BANNER_RETRY));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('has no close button, even when the setting-up banner was closed', () => {
      const { getByTestId, queryByTestId } = renderBanner('failed', true);

      expect(getByTestId(MoneyMfaTestIds.FAILED_BANNER)).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyMfaTestIds.SETTING_UP_BANNER_CLOSE),
      ).not.toBeOnTheScreen();
    });
  });

  it.each<MoneyMfaStatus>(['unavailable', 'not_set_up', 'enabled', 'off'])(
    'renders nothing when the status is %s',
    (status) => {
      const { toJSON } = renderBanner(status);

      expect(toJSON()).toBeNull();
      expect(announce).not.toHaveBeenCalled();
    },
  );
});
