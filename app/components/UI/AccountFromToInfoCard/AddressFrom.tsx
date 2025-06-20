import { toChecksumAddress } from 'ethereumjs-util';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { toHex } from '@metamask/controller-utils';

import { strings } from '../../../../locales/i18n';
import AccountBalance from '../../../component-library/components-temp/Accounts/AccountBalance';
import { BadgeVariant } from '../../../component-library/components/Badges/Badge';
import Text from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { selectAccountsByChainId } from '../../../selectors/accountTrackerController';
import { selectNetworkConfigurationByChainId } from '../../../selectors/networkController';
import { RootState } from '../../../reducers';
import {
  getLabelTextByAddress,
  renderAccountName,
} from '../../../util/address';
import useAddressBalance from '../../hooks/useAddressBalance/useAddressBalance';
import stylesheet from './AddressFrom.styles';
import { selectInternalEvmAccounts } from '../../../selectors/accountsController';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../util/networks';
import useNetworkInfo from '../../Views/confirmations/hooks/useNetworkInfo';
import { getNetworkImageSource } from '../../../util/networks';
import { selectEvmNetworkName } from '../../../selectors/networkInfos';
import { selectEvmNetworkImageSource } from '../../../selectors/networkInfos';

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
    chainId,
  );

  const accountsByChainId = useSelector(selectAccountsByChainId);
  const networkConfiguration = useSelector((state: RootState) =>
    chainId ? selectNetworkConfigurationByChainId(state, toHex(chainId)) : null,
  );

  const internalAccounts = useSelector(selectInternalEvmAccounts);
  const activeAddress = toChecksumAddress(from);
  
  const globalNetworkName = useSelector(selectEvmNetworkName);
  const globalNetworkImage = useSelector(selectEvmNetworkImageSource);

  let perDappNetworkName, perDappNetworkImageSource;
  if(origin) {
    const perDappNetworkInfo = useNetworkInfo(origin);
    perDappNetworkName = perDappNetworkInfo.networkName;
    perDappNetworkImageSource = perDappNetworkInfo.networkImageSource;
  }

  let sendFlowNetworkName, sendFlowNetworkImageSource;

  if (isRemoveGlobalNetworkSelectorEnabled() && networkConfiguration) {
    sendFlowNetworkName = networkConfiguration.name;
  }

  if (isRemoveGlobalNetworkSelectorEnabled() && chainId) {
    // @ts-expect-error The utils/network file is still JS and this function expects a networkType, which should be optional
    const sendFlowChainImage = getNetworkImageSource({ chainId: toHex(chainId) });
    if (sendFlowChainImage) {
      sendFlowNetworkImageSource = sendFlowChainImage;
    }
  }

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

  const displayNetworkName = origin 
    ? perDappNetworkName 
    : isRemoveGlobalNetworkSelectorEnabled() ? sendFlowNetworkName : globalNetworkName;
  
  const displayNetworkImage = origin 
    ? perDappNetworkImageSource
    : isRemoveGlobalNetworkSelectorEnabled() ? sendFlowNetworkImageSource : globalNetworkImage;

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
        accountNetwork={String(displayNetworkName)}
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
