import React from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): reuse Perps explorer hook until shared perps utilities are extracted.
import { usePerpsBlockExplorerUrl } from '../../../UI/Perps/hooks';
import { ActivityDetailsWebviewButton } from './ActivityDetailsFooter';

export function ActivityDetailsPerpsExplorerButton() {
  const selectedAccount = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  );
  const { getExplorerUrl } = usePerpsBlockExplorerUrl();
  const explorerUrl = selectedAccount?.address
    ? (getExplorerUrl(selectedAccount.address) ?? undefined)
    : undefined;

  return (
    <ActivityDetailsWebviewButton
      label={strings('activity_details.view_on_block_explorer')}
      testID={ActivityDetailsSelectorsIDs.BLOCK_EXPLORER_BUTTON}
      url={explorerUrl}
    />
  );
}
