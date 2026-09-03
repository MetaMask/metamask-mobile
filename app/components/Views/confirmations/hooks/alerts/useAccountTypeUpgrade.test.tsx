import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  renderHookWithProvider,
} from '../../../../../util/test/renderWithProvider';
import {
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import { useAccountTypeUpgrade } from './useAccountTypeUpgrade';
import { AccountTypeUpgradeAlertTestIds } from './account-type-upgrade-alert.testIds';
import AppConstants from '../../../../../core/AppConstants';

describe('useAccountTypeUpgrade', () => {
  it('returns alert for upgrade+batched account request', () => {
    const { result } = renderHookWithProvider(() => useAccountTypeUpgrade(), {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });
    const currentAlert = result.current[0];
    delete currentAlert.content;

    expect(currentAlert).toEqual({
      field: 'accountTypeUpgrade',
      key: 'accountTypeUpgrade',
      severity: 'info',
      title: 'Updating your account',
    });
  });

  it('opens smart accounts URL when learn more button is pressed', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValueOnce(undefined);

    const { result } = renderHookWithProvider(() => useAccountTypeUpgrade(), {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });

    const { getByTestId } = renderWithProvider(
      <>{result.current[0].content}</>,
    );

    fireEvent.press(
      getByTestId(AccountTypeUpgradeAlertTestIds.LEARN_MORE_BUTTON),
    );

    expect(openUrlSpy).toHaveBeenCalledWith(AppConstants.URLS.SMART_ACCOUNTS);
  });
});
