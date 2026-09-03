import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';

import { strings } from '../../../../../../../locales/i18n';
import AccountBalance from '../../../../../../component-library/components-temp/Accounts/AccountBalance';
import { BadgeVariant } from '../../../../../../component-library/components/Badges/Badge';
import { useStyles } from '../../../../../../component-library/hooks';
import { selectAccountsByChainId } from '../../../../../../selectors/accountTrackerController';
import {
  getLabelTextByAddress,
  renderAccountName,
  toChecksumAddress,
} from '../../../../../../util/address';
import useAddressBalance from '../../../../../hooks/useAddressBalance/useAddressBalance';
import {
  ORIGIN_DEEPLINK,
  ORIGIN_QR_CODE,
} from './ApproveTransactionHeader.constants';
import stylesheet from './ApproveTransactionHeader.styles';
import { ApproveTransactionHeaderI } from './ApproveTransactionHeader.types';
import { selectInternalAccounts } from '../../../../../../selectors/accountsController';
import ApprovalTagUrl from '../../../../../UI/ApprovalTagUrl';
import { RootState } from '../../../../../../reducers';
import { INTERNAL_ORIGINS } from '../../../../../../constants/transaction';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { selectNetworkConfigurationByChainId } from '../../../../../../selectors/networkController';
import { selectAvatarAccountType } from '../../../../../../selectors/settings';

const ApproveTransactionHeader = ({
  chainId,
  from,
  origin,
  url,
  sdkDappMetadata,
  currentEnsName,
  asset,
  dontWatchAsset,
  networkClientId,
}: ApproveTransactionHeaderI) => {
  const [accountName, setAccountName] = useState('');

  const [isOriginDeepLink, setIsOriginDeepLink] = useState(false);
  const { styles } = useStyles(stylesheet, {});
  const { addressBalance } = useAddressBalance(
    asset,
    from,
    dontWatchAsset,
    chainId,
    networkClientId,
  );
  const networkConfiguration = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, chainId),
  );

  const networkImage = getNetworkImageSource({ chainId: chainId as Hex });

  const accountsByChainId = useSelector(selectAccountsByChainId);

  const internalAccounts = useSelector(selectInternalAccounts);
  const activeAddress = toChecksumAddress(from);

  const networkName = networkConfiguration?.name;

  const avatarAccountType = useSelector(selectAvatarAccountType);

  useEffect(() => {
    const accountNameVal = activeAddress
      ? renderAccountName(activeAddress, internalAccounts)
      : '';

    const isOriginDeepLinkVal =
      origin === ORIGIN_DEEPLINK || origin === ORIGIN_QR_CODE;

    setAccountName(accountNameVal);
    setIsOriginDeepLink(isOriginDeepLinkVal);
  }, [accountsByChainId, internalAccounts, activeAddress, origin]);

  const accountTypeLabel = getLabelTextByAddress(activeAddress) ?? undefined;

  const showOrigin =
    origin && !isOriginDeepLink && !INTERNAL_ORIGINS.includes(origin);

  return (
    <View style={styles.transactionHeader}>
      {showOrigin ? (
        <ApprovalTagUrl
          origin={origin}
          url={url}
          sdkDappMetadata={sdkDappMetadata}
          currentEnsName={currentEnsName}
        />
      ) : null}
      <AccountBalance
        accountAddress={activeAddress}
        accountTokenBalance={addressBalance}
        accountName={accountName}
        accountBalanceLabel={strings('transaction.balance')}
        accountTypeLabel={accountTypeLabel}
        accountNetwork={networkName}
        badgeProps={{
          variant: BadgeVariant.Network,
          name: networkName,
          imageSource: networkImage,
        }}
        avatarAccountType={avatarAccountType}
      />
    </View>
  );
};

export default ApproveTransactionHeader;
