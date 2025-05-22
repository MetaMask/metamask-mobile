import { toChecksumAddress } from 'ethereumjs-util';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import { strings } from '../../../../locales/i18n';
import AccountBalance from '../../../component-library/components-temp/Accounts/AccountBalance';
import { BadgeVariant } from '../../../component-library/components/Badges/Badge';
import Text from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import {
  selectEvmNetworkImageSource,
  selectEvmNetworkName,
} from '../../../selectors/networkInfos';
import {
  getLabelTextByAddress,
  renderAccountName,
} from '../../../util/address';
import useAddressBalance from '../../hooks/useAddressBalance/useAddressBalance';
import stylesheet from './AddressFrom.styles';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { useNetworkInfo } from '../../../selectors/selectedNetworkController';
import { isPerDappSelectedNetworkEnabled } from '../../../util/networks';

interface Asset {
  isETH?: boolean;
  tokenId?: string;
  address: string;
  symbol: string;
  decimals: number;
  image?: string;
  name?: string;
  standard?: string;
}

interface AddressFromProps {
  asset: Asset;
  dontWatchAsset?: boolean;
  from: string;
  origin?: string;
  chainId?: string;
}

const AddressFrom = ({
  asset,
  chainId,
  dontWatchAsset,
  from,
  origin,
}: AddressFromProps) => {
  const [accountName, setAccountName] = useState('');

  const { styles } = useStyles(stylesheet, {});
  const { addressBalance } = useAddressBalance(
    asset,
    from,
    dontWatchAsset,
    isPerDappSelectedNetworkEnabled() ? chainId : undefined,
  );

  const accountsByChainId = useSelector(selectAccountsByChainId);

  const internalAccounts = useSelector(selectInternalAccounts);
  const activeAddress = toChecksumAddress(from);

  const networkName = useSelector(selectEvmNetworkName);
  const networkImage = useSelector(selectEvmNetworkImageSource);
  const perDappNetworkInfo = useNetworkInfo(origin);

  const useBlockieIcon = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.settings.useBlockieIcon,
  );

  useEffect(() => {
    const accountNameVal = activeAddress
      ? renderAccountName(activeAddress, internalAccounts)
      : '';
    setAccountName(accountNameVal);

    if (!origin) {
      return;
    }
  }, [accountsByChainId, internalAccounts, activeAddress, origin]);

  const displayNetworkName = isPerDappSelectedNetworkEnabled() 
    ? perDappNetworkInfo.networkName 
    : networkName;
  
  const displayNetworkImage = isPerDappSelectedNetworkEnabled() 
    ? perDappNetworkInfo.networkImageSource 
    : networkImage;

  const accountTypeLabel = getLabelTextByAddress(activeAddress);

  return (
    <View style={styles.container}>
      <View style={styles.fromTextContainer}>
        <Text style={styles.fromText}>
          {strings('transaction.fromWithColon')}
        </Text>
      </View>
      <AccountBalance
        accountAddress={activeAddress}
        accountTokenBalance={addressBalance}
        accountName={accountName}
        accountBalanceLabel={strings('transaction.balance')}
        accountTypeLabel={accountTypeLabel as string}
        accountNetwork={displayNetworkName}
        badgeProps={{
          variant: BadgeVariant.Network,
          name: displayNetworkName,
          imageSource: displayNetworkImage,
        }}
        useBlockieIcon={useBlockieIcon}
      />
    </View>
  );
};

export default AddressFrom;
