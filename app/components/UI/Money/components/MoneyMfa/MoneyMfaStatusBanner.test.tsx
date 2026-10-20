import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import type { MoneyMfaStatus } from '../../hooks/useMoneyMfa';
import MoneyMfaStatusBanner from './MoneyMfaStatusBanner';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';

const renderBanner = (status: MoneyMfaStatus) => {
  const onRetry = jest.fn();
  const onDismissFailure = jest.fn();
  const utils = render(
    <MoneyMfaStatusBanner
      status={status}
      onRetry={onRetry}
      onDismissFailure={onDismissFailure}
    />,
  );
  return { ...utils, onRetry, onDismissFailure };
};

describe('MoneyMfaStatusBanner', () => {
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

    it('hides the banner when close is pressed', () => {
      const { getByTestId, queryByTestId, onDismissFailure } =
        renderBanner('setting_up');

      fireEvent.press(getByTestId(MoneyMfaTestIds.SETTING_UP_BANNER_CLOSE));

      expect(
        queryByTestId(MoneyMfaTestIds.SETTING_UP_BANNER),
      ).not.toBeOnTheScreen();
      expect(onDismissFailure).not.toHaveBeenCalled();
    });

    it('shows the failed banner after a hidden setup fails', () => {
      const { getByTestId, rerender, onRetry, onDismissFailure } =
        renderBanner('setting_up');
      fireEvent.press(getByTestId(MoneyMfaTestIds.SETTING_UP_BANNER_CLOSE));

      rerender(
        <MoneyMfaStatusBanner
          status="failed"
          onRetry={onRetry}
          onDismissFailure={onDismissFailure}
        />,
      );

      expect(getByTestId(MoneyMfaTestIds.FAILED_BANNER)).toBeOnTheScreen();
    });

    it('shows the setting up banner again on a new setup after it was hidden', () => {
      const { getByTestId, rerender, onRetry, onDismissFailure } =
        renderBanner('setting_up');
      fireEvent.press(getByTestId(MoneyMfaTestIds.SETTING_UP_BANNER_CLOSE));
      rerender(
        <MoneyMfaStatusBanner
          status="failed"
          onRetry={onRetry}
          onDismissFailure={onDismissFailure}
        />,
      );

      rerender(
        <MoneyMfaStatusBanner
          status="setting_up"
          onRetry={onRetry}
          onDismissFailure={onDismissFailure}
        />,
      );

      expect(getByTestId(MoneyMfaTestIds.SETTING_UP_BANNER)).toBeOnTheScreen();
    });
  });

  describe('failed', () => {
    it('renders the failed copy', () => {
      const { getByTestId, getByText } = renderBanner('failed');

      expect(getByTestId(MoneyMfaTestIds.FAILED_BANNER)).toBeOnTheScreen();
      expect(getByText(strings('money.mfa.failed_title'))).toBeOnTheScreen();
      expect(
        getByText(
          `${strings('money.mfa.failed_description')} ${strings(
            'money.mfa.failed_retry',
          )}`,
        ),
      ).toBeOnTheScreen();
    });

    it('calls onRetry when Try again is pressed', () => {
      const { getByTestId, onRetry } = renderBanner('failed');

      fireEvent.press(getByTestId(MoneyMfaTestIds.FAILED_BANNER_RETRY));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('calls onDismissFailure when close is pressed', () => {
      const { getByTestId, onDismissFailure } = renderBanner('failed');

      fireEvent.press(getByTestId(MoneyMfaTestIds.FAILED_BANNER_CLOSE));

      expect(onDismissFailure).toHaveBeenCalledTimes(1);
    });
  });

  it.each<MoneyMfaStatus>(['unavailable', 'not_set_up', 'enabled', 'off'])(
    'renders nothing when the status is %s',
    (status) => {
      const { toJSON } = renderBanner(status);

      expect(toJSON()).toBeNull();
    },
  );
});
