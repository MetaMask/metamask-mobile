import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { usePerpsDepositInit } from '../../../external/perps-temp/hooks/usePerpsDepositInit';

export function PerpsDepositInfo() {
  useNavbar(strings('confirm.title.perps_deposit'));
  usePerpsDepositInit();

  return <CustomAmountInfo />;
}
