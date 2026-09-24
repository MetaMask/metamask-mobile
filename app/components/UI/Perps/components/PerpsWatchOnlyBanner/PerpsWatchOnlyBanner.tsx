import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  selectIsSelectedAccountWatchOnly,
  selectSelectedAccountGroupEvmInternalAccount,
} from '../../../../../selectors/multichainAccounts/accountTreeController';
import { formatAddress } from '../../../../../util/address';
import { WatchOnlySession } from '../../../../../core/WatchOnly/WatchOnlySession';
import Logger from '../../../../../util/Logger';
import { PerpsWatchOnlySelectorsIDs } from '../../Perps.testIds';

interface PerpsWatchOnlyBannerProps {
  twClassName?: string;
}

/**
 * Persistent notice shown on Perps screens while a watch-only account is
 * selected, with a shortcut back to the previously selected account.
 */
const PerpsWatchOnlyBanner: React.FC<PerpsWatchOnlyBannerProps> = ({
  twClassName,
}) => {
  const account = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const isWatchOnly = useSelector(selectIsSelectedAccountWatchOnly);

  const handleSwitchBack = useCallback(() => {
    WatchOnlySession.stop().catch((error: Error) =>
      Logger.error(error, 'PerpsWatchOnlyBanner: failed to stop session'),
    );
  }, []);

  if (!isWatchOnly || !account) {
    return null;
  }

  return (
    <BannerAlert
      severity={BannerAlertSeverity.Warning}
      title={strings('perps.watch_only.title')}
      description={strings('perps.watch_only.description', {
        address: formatAddress(account.address, 'short'),
      })}
      actionButtonLabel={strings('perps.watch_only.switch_back')}
      actionButtonOnPress={handleSwitchBack}
      actionButtonProps={{
        testID: PerpsWatchOnlySelectorsIDs.SWITCH_BACK_BUTTON,
      }}
      testID={PerpsWatchOnlySelectorsIDs.BANNER}
      twClassName={twClassName}
    />
  );
};

export default PerpsWatchOnlyBanner;
