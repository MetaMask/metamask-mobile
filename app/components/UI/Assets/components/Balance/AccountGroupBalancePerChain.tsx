import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { selectBalanceBySelectedAccountGroup } from '../../../../../selectors/assets/balances';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import { useFormatters } from '../../../../hooks/useFormatters';

export interface AccountGroupBalancePerChainProps {
  caipChainId: CaipChainId;
}

/**
 * Displays the selected account group's aggregated balance for a single chain.
 * Used in network selector list to show balance per network row.
 */
const AccountGroupBalancePerChain = ({
  caipChainId,
}: AccountGroupBalancePerChainProps) => {
  const { formatCurrency } = useFormatters();
  const privacyMode = useSelector(selectPrivacyMode);

  const balanceSelector = useMemo(
    () => selectBalanceBySelectedAccountGroup([caipChainId]),
    [caipChainId],
  );

  const groupBalance = useSelector(balanceSelector) as {
    totalBalanceInUserCurrency: number;
    userCurrency: string;
  } | null;

  const totalBalance = groupBalance?.totalBalanceInUserCurrency ?? 0;
  const userCurrency = groupBalance?.userCurrency ?? 'USD';
  const displayBalance = formatCurrency(totalBalance, userCurrency);

  return (
    <SensitiveText
      isHidden={privacyMode}
      length={SensitiveTextLength.Short}
      variant={TextVariant.BodyMD}
    >
      {displayBalance}
    </SensitiveText>
  );
};

export default AccountGroupBalancePerChain;
