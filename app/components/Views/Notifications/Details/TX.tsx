/* eslint-disable react/prop-types */
import { Hex } from '@metamask/utils';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import images from 'images/image-icons';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import RemoteImage from '../../../Base/RemoteImage';
import NftFallbackImage from '../../../../../docs/assets/nft-fallback.png';
import Avatar, {
  AvatarAccountType,
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import {
  getRowDetails,
  Notification,
  TRIGGER_TYPES,
  TxStatus,
  returnAvatarProps,
} from '../../../../util/notifications';
import AvatarIcon from '../../../../component-library/components/Avatars/Avatar/variants/AvatarIcon';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import { DEFAULT_BADGEWRAPPER_BADGEPOSITION } from '../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';
import { BottomSheetRef } from '../../../../component-library/components/BottomSheets/BottomSheet';
import Button, {
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import NetworkMainAssetLogo from '../../../../components/UI/NetworkMainAssetLogo';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
import {
  getTestNetImageByChainId,
  isLineaMainnetByChainId,
  isMainnetByChainId,
  isTestNet,
} from '../../../../util/networks';
import { balanceToFiat } from '../../../../util/number';
import { Theme } from '../../../../util/theme/models';
import EthereumAddress from '../../../UI/EthereumAddress';
import GasDetails from './GasDetails';
import { createStyles } from './styles';

interface Props {
  notification: Notification;
  styles: any;
  theme: Theme;
  accountAvatarType?: AvatarAccountType;
  navigation: any;
  copyToClipboard: (type: string, selectedString?: string) => Promise<void>;
}
const ADD = 'add';

const TXDetails: React.FC<Props> = ({
  notification,
  theme,
  accountAvatarType,
  navigation,
  copyToClipboard,
}: Props) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [notificationDetails, setNotificationDetails] =
    useState<Record<string, any>>();

  const sheetRef = useRef<BottomSheetRef>(null);
  const styles = createStyles(theme);
  const conversionRate = useSelector(selectConversionRate);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const contractExchangeRates = useSelector(selectContractExchangeRates);

  useEffect(() => {
    setNotificationDetails(getRowDetails(notification)?.details || {});
  }, [notification]);

  const renderAddress = useCallback(
    ({
      key,
      address,
      actionType,
    }: {
      key: string;
      address: string;
      actionType: TRIGGER_TYPES;
    }) => {
      const showsAddContact =
        (actionType.includes('received') && key === 'from') ||
        (actionType.includes('sent') && key === 'to');

      return (
        <View style={styles.row}>
          <Avatar
            variant={AvatarVariant.Account}
            type={accountAvatarType}
            // @ts-ignore
            accountAddress={notification.data?.from}
            size={AvatarSize.Md}
            style={styles.badgeWrapper}
          />
          <View style={styles.boxLeft}>
            <Text variant={TextVariant.BodyLGMedium}>
              {strings(
                key === 'from' ? 'transactions.from' : 'transactions.to',
              )}
            </Text>
            <Pressable
              style={styles.descriptionContainer}
              onPress={() => copyToClipboard('address', address)}
              hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
            >
              <EthereumAddress
                style={styles.addressLinkLabel}
                address={address}
                type={'short'}
              />
              <Icon
                style={styles.copyIconDefault}
                name={IconName.Copy}
                size={IconSize.Md}
              />
            </Pressable>
          </View>
          {showsAddContact && (
            <Pressable
              style={styles.rightSection}
              hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
              onPress={() => navigation.navigate('ContactForm', { mode: ADD })}
            >
              <Text variant={TextVariant.BodyMD} style={styles.copyTextBtn}>
                {strings('address_book.add_contact')}
              </Text>
            </Pressable>
          )}
        </View>
      );
    },
    [accountAvatarType, copyToClipboard, navigation, notification, styles],
  );

  const renderStatus = useCallback(
    (status: TxStatus, tx_hash: string) => (
      <View style={styles.row}>
        <Avatar
          variant={AvatarVariant.Icon}
          size={AvatarSize.Md}
          style={styles.badgeWrapper}
          {...returnAvatarProps(status, theme)}
        />
        <View style={styles.boxLeft}>
          <Text variant={TextVariant.BodyLGMedium}>
            {strings('transactions.status')}
          </Text>

          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
            {strings(`transaction.${status}`)}
          </Text>
        </View>
        <Pressable
          style={styles.rightSection}
          onPress={() => copyToClipboard('transaction', tx_hash)}
          hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
        >
          <Text variant={TextVariant.BodyMD} style={styles.copyTextBtn}>
            {strings('transaction.transaction_id')}
          </Text>
          <Icon
            color={IconColor.Primary}
            style={styles.copyIconRight}
            name={IconName.Copy}
            size={IconSize.Md}
          />
        </Pressable>
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [copyToClipboard, notification, theme],
  );

    const renderNetwork = useCallback(
    (network) => (
      <View style={styles.row}>
        <Avatar
          variant={AvatarVariant.Network}
          size={AvatarSize.Md}
          style={styles.badgeWrapper}
          imageSource={NetworkBadgeSource(`0x${(notification as any).chain_id }`)}
        />

        <View style={styles.boxLeft}>
          <Text variant={TextVariant.BodyLGMedium}>
            {strings('asset_details.network')}
          </Text>

          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {network}
          </Text>
        </View>
      </View>
    ),
    [],
  );

  const renderNFT = useCallback(
    (notificationDetails) => {
      const { nft, from, to, status, tx_hash, collection, network, networkFee } = notificationDetails;
      return (
        <>
          <Badge
            variant={BadgeVariant.Network}
            imageSource={NetworkBadgeSource(`0x${(notification as any).chain_id }`)}
            style={styles.nftBadgeWrapper}
          />
          <RemoteImage
            placeholderStyle={styles.nftPlaceholder}
            source={nft.image || NftFallbackImage}
            style={styles.renderTxNFT}
          />
          {renderAddress({ key: 'from', address: from, actionType: notification.type})}
          {renderAddress({ key: 'to', address: to, actionType: notification.type})}
          {renderStatus(status, tx_hash)}
          <View style={styles.row}>
        <Avatar
          variant={AvatarVariant.Icon}
          size={AvatarSize.Md}
          style={styles.badgeWrapper}
          {...returnAvatarProps(status, theme)}
        />
        <View style={styles.boxLeft}>
          <Text variant={TextVariant.BodyLGMedium}>
            {strings('transactions.status')}
          </Text>

          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
            {strings(`transaction.${status}`)}
          </Text>
        </View>
        <Pressable
          style={styles.rightSection}
          onPress={() => copyToClipboard('transaction', tx_hash)}
          hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
        >
          <Text variant={TextVariant.BodyMD} style={styles.copyTextBtn}>
            {strings('transaction.transaction_id')}
          </Text>
          <Icon
            color={IconColor.Primary}
            style={styles.copyIconRight}
            name={IconName.Copy}
            size={IconSize.Md}
          />
        </Pressable>
      </View>
        {renderNetwork(status, tx_hash)}
        {renderNetworkFee(status, tx_hash)}
      </>
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notification],
  );

  const renderNotificationDetails = useCallback(
    (notification) => {
      switch (notification.type) {
        case TRIGGER_TYPES.ERC721_SENT:
        case TRIGGER_TYPES.ERC721_RECEIVED:
        case TRIGGER_TYPES.ERC1155_SENT:
        case TRIGGER_TYPES.ERC1155_RECEIVED:
          return renderNFT(notificationDetails);
        case TRIGGER_TYPES.LIDO_STAKE_COMPLETED:
        case TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED:
        case TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED:
        case TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED:
        case TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED:
          return renderStake(notificationDetails);
        case TRIGGER_TYPES.LIDO_STAKE_READY_TO_BE_WITHDRAWN:
          return renderStakeReadyToBeWithdrawn(notificationDetails);
        case TRIGGER_TYPES.METAMASK_SWAP_COMPLETED:
          return renderSwap(notificationDetails);
        case TRIGGER_TYPES.ERC20_SENT:
        case TRIGGER_TYPES.ERC20_RECEIVED:
          return renderERC20(notificationDetails);
        default:
          return renderETH(notificationDetails);
      }
},[]);

  const isMainnet = isMainnetByChainId(notification.chain_id);
  const isLineaMainnet = isLineaMainnetByChainId(notification.chain_id);

  const NetworkBadgeSource = (chainId: Hex) => {
    if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);

    if (isMainnet) return images.ETHEREUM;

    if (isLineaMainnet) return images['LINEA-MAINNET'];

    return notification.data.token.symbol
      ? images[notification.data.token.symbol]
      : undefined;
  };



  // const fetchNetworkFees = useCallback(async () => {
  //   try {
  //     const networkFees = await getNetworkFees(notification)
  //     if (networkFees) {
  //       setNetworkFees({
  //         transactionFee: {
  //           transactionFeeInEther: networkFees.transactionFeeInEth,
  //           transactionFeeInUsd: networkFees.transactionFeeInUsd,
  //         },
  //         gasLimitUnits: networkFees.gasLimit,
  //         gasUsedUnits: networkFees.gasUsed,
  //         baseFee: networkFees.baseFee,
  //         priorityFee: networkFees.priorityFee,
  //         maxFeePerGas: networkFees.maxFeePerGas,
  //       })
  //     }
  //   } catch (err) {
  //     setNetworkFeesError(true)
  //   }
  // }, [notification])

  // const renderAsset = useCallback(
  //   () => {
  //     const exchangeRate =
  //       transaction.asset.address &&
  //       contractExchangeRates[transaction.asset.address];
  //     const balanceFiat = transaction
  //       ? balanceToFiat(
  //           transaction.value?.toString() || '0',
  //           conversionRate,
  //           exchangeRate || 0,
  //           currentCurrency,
  //         )
  //       : undefined;

  //     return (
  //       <View style={styles.row}>
  //         <BadgeWrapper
  //           badgePosition={DEFAULT_BADGEWRAPPER_BADGEPOSITION}
  //           badgeElement={
  //             <Badge
  //               variant={BadgeVariant.Network}
  //               imageSource={NetworkBadgeSource(`0x${notification.chain_id}`)}
  //             />
  //           }
  //           style={styles.badgeWrapper}
  //         >
  //           {notification?.data?.token?.isETH ? (
  //             <NetworkMainAssetLogo style={styles.ethLogo} />
  //           ) : (
  //             <AvatarToken
  //               name={notification?.data?.token?.symbol}
  //               imageSource={{
  //                 uri: notification?.data?.token?.image,
  //               }}
  //               size={AvatarSize.Lg}
  //             />
  //           )}
  //         </BadgeWrapper>
  //         <View style={styles.boxLeft}>
  //           <Text variant={TextVariant.BodyLGMedium}>
  //             {strings('transaction.asset')}
  //           </Text>

  //           <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
  //             {notification?.data?.token?.name}
  //           </Text>
  //         </View>
  //         <View style={[styles.boxLeft, styles.boxRight]}>
  //           <Text variant={TextVariant.BodyLGMedium}>
  //             {notification?.data?.token?.amount ||
  //               0 + ' ' + notification?.data?.token?.symbol}
  //           </Text>
  //           <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
  //             {balanceFiat}
  //           </Text>
  //         </View>
  //       </View>
  //     );
  //   },
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  //   [notification],
  // );

  // const renderNetworkFee = useCallback(
  //   () => (
  //     <View style={styles.row}>
  //       <AvatarIcon
  //         size={AvatarSize.Md}
  //         name={IconName.Gas}
  //         iconColor={IconColor.Info}
  //         style={styles.badgeWrapper}
  //       />
  //       <View style={styles.boxLeft}>
  //         <Text variant={TextVariant.BodyLGMedium}>
  //           {strings('transactions.network_fee')}
  //         </Text>

  //         <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
  //           {notification.data?.network_fee.gas_price}
  //         </Text>
  //       </View>
  //       <Pressable
  //         style={styles.rightSection}
  //         hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
  //         onPress={() => {
  //           setIsCollapsed(!isCollapsed);
  //           sheetRef.current?.onOpenBottomSheet();
  //         }}
  //       >
  //         <Text variant={TextVariant.BodyMD} style={styles.copyTextBtn}>
  //           {strings('transactions.details')}
  //         </Text>
  //         <Icon
  //           color={IconColor.Primary}
  //           style={styles.copyIconRight}
  //           name={IconName.ArrowDown}
  //           size={IconSize.Md}
  //         />
  //       </Pressable>
  //     </View>
  //   ),
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  //   [notification],
  // );

  return (
    <View style={styles.renderContainer}>
      {renderNotificationDetails(notification)}
      {!isCollapsed && (
        <GasDetails
          sheetRef={sheetRef}
          transaction={notification}
          styles={styles}
          onClosed={() => setIsCollapsed(true)}
        />
      )}
      <Button
        variant={ButtonVariants.Secondary}
        label={strings('transactions.view_on_etherscan')}
        style={styles.ctaBtn}
        // eslint-disable-next-line no-console
        onPress={() => console.log('View on etherscan')}
        endIconName={IconName.Arrow2Upright}
      /> */}
    </View>
  );
};

export default TXDetails;
