import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { usePerpsDepositToken } from '../../../hooks/perps-deposit/usePerpsDepositToken';

export function PerpsDepositInfo() {
  useNavbar(strings('confirm.title.perps_deposit'));
  usePerpsDepositToken();

  return <CustomAmountInfo />;
}
