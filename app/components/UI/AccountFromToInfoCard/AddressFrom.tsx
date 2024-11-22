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
  selectNetworkImageSource,
  selectNetworkName,
} from '../../../selectors/networkInfos';
import {
  getLabelTextByAddress,
  renderAccountName,
} from '../../../util/address';
import useAddressBalance from '../../hooks/useAddressBalance/useAddressBalance';
import stylesheet from './AddressFrom.styles';
import { selectInternalAccounts } from '../../../selectors/accountsController';

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
}

const AddressFrom = ({
  asset,
  dontWatchAsset,
  from,
  origin,
}: AddressFromProps) => {
  const [accountName, setAccountName] = useState('');

  const { styles } = useStyles(stylesheet, {});
  const { addressBalance } = useAddressBalance(asset, from, dontWatchAsset);

  const accountsByChainId = useSelector(selectAccountsByChainId);

  const internalAccounts = useSelector(selectInternalAccounts);
  const activeAddress = toChecksumAddress(from);

  const networkName = useSelector(selectNetworkName);

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

  const networkImage = useSelector(selectNetworkImageSource);

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
        accountNetwork={networkName}
        badgeProps={{
          variant: BadgeVariant.Network,
          name: networkName,
          imageSource: networkImage,
        }}
        useBlockieIcon={useBlockieIcon}
      />
    </View>
  );
};

export default AddressFrom;
