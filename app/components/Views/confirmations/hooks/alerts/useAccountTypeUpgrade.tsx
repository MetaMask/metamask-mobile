import React, { useMemo } from 'react';
import { Linking } from 'react-native';

import AppConstants from '../../../../../core/AppConstants';
import { strings } from '../../../../../../locales/i18n';
import { Alert, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { use7702TransactionType } from '../7702/use7702TransactionType';
import { Text, TextColor } from '@metamask/design-system-react-native';

export function useAccountTypeUpgrade(): Alert[] {
  const { isBatchedUpgrade } = use7702TransactionType();

  return useMemo(() => {
    if (!isBatchedUpgrade) {
      return [];
    }

    return [
      {
        field: RowAlertKey.AccountTypeUpgrade,
        key: RowAlertKey.AccountTypeUpgrade,
        content: (
          <Text>
            {strings('alert_system.upgrade_account.message')}{' '}
            <Text
              color={TextColor.PrimaryDefault}
              onPress={() => Linking.openURL(AppConstants.URLS.SMART_ACCOUNTS)}
            >
              {strings('alert_system.upgrade_account.learn_more')}
            </Text>
          </Text>
        ),
        severity: Severity.Info,
        title: strings('alert_system.upgrade_account.title'),
      },
    ];
  }, [isBatchedUpgrade]);
}
