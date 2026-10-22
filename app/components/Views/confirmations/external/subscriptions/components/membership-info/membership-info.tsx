import React from 'react';
import BigNumber from 'bignumber.js';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { moneyFormatUsd } from '../../../../../../UI/Money/utils/moneyFormatFiat';

interface MembershipInfoProps {
  /** Amount being added to the Money account, in USD. */
  amountFiat: string;
}

export function MembershipInfo({ amountFiat }: MembershipInfoProps) {
  return (
    <BannerAlert
      severity={BannerAlertSeverity.Info}
      description={strings('confirm.membership_top_up_info', {
        amount: moneyFormatUsd(new BigNumber(amountFiat || '0')),
      })}
      twClassName="w-full"
      testID="membership-info-banner"
    />
  );
}
