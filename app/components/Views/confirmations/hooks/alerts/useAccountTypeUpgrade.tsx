import React, { useMemo } from 'react';
import { Linking } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { Alert, Severity } from '../../types/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { use7702TransactionType } from '../7702/use7702TransactionType';

const ACCOUNT_UPGRADE_URL =
  'https://support.metamask.io/configure/accounts/what-is-a-smart-account';

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
            {strings('alert_system.upgarde_account.message')}{' '}
            <Text
              color={TextColor.Primary}
              onPress={() => Linking.openURL(ACCOUNT_UPGRADE_URL)}
            >
              {strings('alert_system.upgarde_account.learn_more')}
            </Text>
          </Text>
        ),
        severity: Severity.Info,
        title: strings('alert_system.upgarde_account.title'),
      },
    ];
  }, [isBatchedUpgrade]);
}
