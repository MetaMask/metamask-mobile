import React, { useEffect, useState, useMemo } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { toHex } from '@metamask/controller-utils';

import { strings } from '../../../../locales/i18n';
import AccountBalance from '../../../component-library/components-temp/Accounts/AccountBalance';
import { BadgeVariant } from '../../../component-library/components/Badges/Badge';
import Text from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { selectNetworkConfigurationByChainId } from '../../../selectors/networkController';
import { RootState } from '../../../reducers';
import {
  getLabelTextByAddress,
  renderAccountName,
  toChecksumAddress,
} from '../../../util/address';
import useAddressBalance from '../../hooks/useAddressBalance/useAddressBalance';
import stylesheet from './AddressFrom.styles';
import { selectInternalEvmAccounts } from '../../../selectors/accountsController';
import {
  isRemoveGlobalNetworkSelectorEnabled,
  getNetworkImageSource,
} from '../../../util/networks';
import {
  selectEvmNetworkImageSource,
  selectEvmNetworkName,
} from '../../../selectors/networkInfos';
import { useNetworkInfo } from '../../../selectors/selectedNetworkController';
import { selectAvatarStyle } from '../../../selectors/settings';

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

  const hexChainId = useMemo(
    () => (chainId ? toHex(chainId) : null),
    [chainId],
  );
  const networkConfiguration = useSelector((state: RootState) =>
    hexChainId ? selectNetworkConfigurationByChainId(state, hexChainId) : null,
  );

  const internalAccounts = useSelector(selectInternalEvmAccounts);

  const globalNetworkName = useSelector(selectEvmNetworkName);
  const globalNetworkImage = useSelector(selectEvmNetworkImageSource);

  const avatarStyle = useSelector(selectAvatarStyle);

  const activeAddress = useMemo(() => toChecksumAddress(from), [from]);
  const isContextualNetworkEnabled = useMemo(
    () => isRemoveGlobalNetworkSelectorEnabled(),
    [],
  );

  const perDappNetworkInfo = useNetworkInfo(origin || '');
  const { networkName, networkImageSource } = perDappNetworkInfo || {};

  const sendFlowNetworkData = useMemo(() => {
    if (!isContextualNetworkEnabled) {
      return { name: null, imageSource: null };
    }

    const name = networkConfiguration?.name || null;
    const imageSource = hexChainId
      ? getNetworkImageSource({ chainId: hexChainId })
      : null;

    return { name, imageSource };
  }, [isContextualNetworkEnabled, networkConfiguration, hexChainId]);

  const accountTypeLabel = useMemo(
    () => getLabelTextByAddress(activeAddress),
    [activeAddress],
  );

  useEffect(() => {
    const accountNameVal = activeAddress
      ? renderAccountName(activeAddress, internalAccounts)
      : '';
    setAccountName(accountNameVal);
  }, [activeAddress, internalAccounts]);

  const displayNetworkName = useMemo(() => {
    if (origin && networkName) {
      return networkName;
    }
    if (isContextualNetworkEnabled) {
      return sendFlowNetworkData.name;
    }
    return globalNetworkName;
  }, [
    origin,
    networkName,
    isContextualNetworkEnabled,
    sendFlowNetworkData,
    globalNetworkName,
  ]);

  const displayNetworkImage = useMemo(() => {
    if (origin && networkImageSource) {
      return networkImageSource;
    }
    if (isContextualNetworkEnabled) {
      return sendFlowNetworkData.imageSource;
    }
    return globalNetworkImage;
  }, [
    origin,
    networkImageSource,
    isContextualNetworkEnabled,
    sendFlowNetworkData,
    globalNetworkImage,
  ]);

  const badgeProps = useMemo(
    () => ({
      variant: BadgeVariant.Network as const,
      name: displayNetworkName || undefined,
      imageSource: displayNetworkImage || undefined,
    }),
    [displayNetworkName, displayNetworkImage],
  );

  const accountBalanceLabel = useMemo(() => strings('transaction.balance'), []);

  const fromLabel = useMemo(() => strings('transaction.fromWithColon'), []);

  return (
    <View style={styles.container}>
      <View style={styles.fromTextContainer}>
        <Text style={styles.fromText}>{fromLabel}</Text>
      </View>
      <AccountBalance
        accountAddress={activeAddress}
        accountTokenBalance={addressBalance}
        accountName={accountName}
        accountBalanceLabel={accountBalanceLabel}
        accountTypeLabel={accountTypeLabel as string}
        accountNetwork={String(displayNetworkName)}
        badgeProps={badgeProps}
        avatarStyle={avatarStyle}
      />
    </View>
  );
};

export default AddressFrom;
