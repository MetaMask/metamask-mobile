import React, { useMemo } from 'react';
import { Text } from 'react-native';
import { Alert, Severity } from '../../types/confirm';
import { strings } from '../../../../../../locales/i18n';
import { Reason } from '../../components/BlockaidBanner/BlockaidBanner.types';
import { REASON_DESCRIPTION_I18N_KEY_MAP } from '../../components/BlockaidBanner/BlockaidBanner.constants';
import { RowAlertKey } from '../../components/UI/InfoRow/AlertRow/constants';


export default function useBlockaidAlerts(): Alert[] {

    const alerts = useMemo(() =>
      // if () {
      //   return [];
      // }

       [
        {
          alertDetails: ['Alert details - 1', 'Alert details - 2'],
          key: RowAlertKey.Blockaid,
          content: <Text>report url: www.google.com</Text>,
          isBlocking: true,
          title: strings('blockaid_banner.other_description'),
          message: strings(REASON_DESCRIPTION_I18N_KEY_MAP[Reason.other]),
          severity: Severity.Danger,
        },
      ] as Alert[]
    , []);

    return alerts;
}
