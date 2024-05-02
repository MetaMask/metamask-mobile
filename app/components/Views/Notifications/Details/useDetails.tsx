import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useSelector } from 'react-redux';

import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import RemoteImage from '../../../Base/RemoteImage';
import NftFallbackImage from '../../../../../docs/assets/nft-fallback.png';
import Avatar, {
  AvatarAccountType,
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import EthereumAddress from '../../../UI/EthereumAddress';

import { strings } from '../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';

import { balanceToFiat } from '../../../../util/number';

import {
  TRIGGER_TYPES,
  TxStatus,
  returnAvatarProps,
  HalRawNotification,
  STAKING_PROVIDER_MAP,
} from '../../../../util/notifications';

import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { createStyles } from './styles';
import { Theme } from '../../../../util/theme/models';
import NotificationBadge from './Badge';

interface useDetailsProps {
  notification: HalRawNotification;
  theme: Theme;
  accountAvatarType?: AvatarAccountType;
  navigation: any;
  copyToClipboard: (type: string, selectedString?: string) => Promise<void>;
}

const useDetails = ({
  notification,
  theme,
  accountAvatarType,
  navigation,
  copyToClipboard,
}: useDetailsProps) => {
  const ADD = 'add';
  const conversionRate = useSelector(selectConversionRate);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const contractExchangeRates = useSelector(selectContractExchangeRates);
  const styles = createStyles(theme);

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
            accountAddress={address}
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
    [accountAvatarType, copyToClipboard, navigation, styles],
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
          imageSource={network.image}
        />

        <View style={styles.boxLeft}>
          <Text variant={TextVariant.BodyLGMedium}>
            {strings('asset_details.network')}
          </Text>

          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
            {network.name}
          </Text>
        </View>
      </View>
    ),
    [styles.badgeWrapper, styles.boxLeft, styles.row],
  );

  const renderCollection = useCallback(
    (type, collection, badgeIcon, network) => (
      <View style={styles.row}>
        <NotificationBadge
          notificationType={type}
          styles={styles}
          badgeIcon={badgeIcon}
          imageUrl={network.image}
        />
        <View style={styles.boxLeft}>
          <Text variant={TextVariant.BodyLGMedium}>
            {strings('collectible.collection')}
          </Text>
          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
            {collection.name}
          </Text>
        </View>
      </View>
    ),
    [styles],
  );

  const renderAsset = useCallback(
    ({ type, title, token, badgeIcon, network }) => {
      const exchangeRate =
        token.address && contractExchangeRates[token.address];
      const balanceFiat = token
        ? balanceToFiat(
            token.amount || '0',
            conversionRate,
            exchangeRate || 0,
            currentCurrency,
          )
        : undefined;
      return (
        <View style={styles.row}>
          <NotificationBadge
            notificationType={type}
            styles={styles}
            badgeIcon={badgeIcon}
            imageUrl={network.image}
          />
          <View style={styles.boxLeft}>
            <Text variant={TextVariant.BodyLGMedium}>{title}</Text>
            <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
              {token.name}
            </Text>
          </View>
          <View style={styles.rightSection}>
            <Text variant={TextVariant.BodyLGMedium}>
              {token.amount || 0 + ' ' + token?.symbol}
            </Text>
            <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
              {balanceFiat}
            </Text>
          </View>
        </View>
      );
    },
    [contractExchangeRates, conversionRate, currentCurrency, styles],
  );

  const renderNFT = useCallback(
    (notificationDetails) => {
      const {
        type,
        nft,
        from,
        to,
        status,
        tx_hash,
        collection,
        badgeIcon,
        network,
      } = notificationDetails as Record<string, any>;
      return (
        <>
          <Badge
            variant={BadgeVariant.Network}
            imageSource={network.image}
            style={styles.nftBadgeWrapper}
          />
          <RemoteImage
            placeholderStyle={styles.nftPlaceholder}
            source={nft.image || NftFallbackImage}
            style={styles.renderTxNFT}
          />
          {renderAddress({
            key: 'from',
            address: from,
            actionType: type,
          })}
          {renderAddress({
            key: 'to',
            address: to,
            actionType: type,
          })}
          {renderStatus(status, tx_hash)}
          {renderCollection(type, collection, badgeIcon, network)}
          {renderNetwork(network)}
        </>
      );
    },
    [
      renderAddress,
      renderCollection,
      renderNetwork,
      renderStatus,
      styles.nftBadgeWrapper,
      styles.nftPlaceholder,
      styles.renderTxNFT,
    ],
  );

  const renderTransfer = useCallback(
    (notificationDetails) => {
      const { type, from, to, status, tx_hash, token, badgeIcon, network } =
        notificationDetails as Record<string, any>;
      return (
        <>
          {renderAddress({
            key: 'from',
            address: from,
            actionType: type,
          })}
          {renderAddress({
            key: 'to',
            address: to,
            actionType: type,
          })}
          {renderAsset({
            type,
            title: strings('transaction.asset'),
            token,
            badgeIcon,
            network,
          })}
          {renderStatus(status, tx_hash)}
          {renderNetwork(network)}
        </>
      );
    },
    [renderAddress, renderAsset, renderNetwork, renderStatus],
  );

  const renderStakeProvider = useCallback(
    (type, stake_in) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const stakingProvider = STAKING_PROVIDER_MAP[type];

      return (
        <View style={styles.row}>
          <RemoteImage
            source={{
              uri:
                stake_in.image ||
                'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg',
            }}
            style={styles.assetLogo}
            placeholderStyle={styles.assetPlaceholder}
          />
          <View style={styles.boxLeft}>
            <Text variant={TextVariant.BodyLGMedium}>
              {strings('notifications.staking_provider')}
            </Text>
            <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
              {stakingProvider}
            </Text>
          </View>
        </View>
      );
    },
    [styles.assetLogo, styles.assetPlaceholder, styles.boxLeft, styles.row],
  );

  const renderStake = useCallback(
    (notificationDetails) => {
      const { type, status, tx_hash, stake_in, stake_out, badgeIcon, network } =
        notificationDetails as Record<string, any>;

      const unstakingInProgress =
        type.indexOf(TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED) > -1 ||
        type.indexOf(TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED) > -1;

      if (unstakingInProgress) {
        return;
      }

      return (
        <>
          {renderAddress({
            key: 'from',
            address: from, // TODO: how to get from in a stake?
            actionType: type,
          })}
          {renderAsset({
            type,
            title: strings('notifications.staked'),
            stake_in,
            badgeIcon,
            network,
          })}
          {renderAsset({
            type,
            title: strings('notifications.unstaked'),
            stake_out,
            badgeIcon,
            network,
          })}
          {renderStatus(status, tx_hash)}
          {renderStakeProvider(type, stake_in)}
        </>
      );
    },
    [renderAddress, renderAsset, renderStakeProvider, renderStatus],
  );

  const renderStakeReadyToBeWithdrawn = useCallback(
    (notificationDetails) => {
      const { type, badgeIcon, staked_eth, tx_hash, status, network } =
        notificationDetails as Record<string, any>;

      return (
        <>
          {renderAddress({
            key: 'from',
            address: from, // TODO: how to get from in a stake?
            actionType: type,
          })}
          {renderStatus(status, tx_hash)}
          {renderAsset({
            type,
            title: strings('notifications.unstaking_requested'),
            staked_eth,
            badgeIcon,
            network,
          })}
          {renderStakeProvider(type, staked_eth)}
        </>
      );
    },
    [renderAddress, renderAsset, renderStakeProvider, renderStatus],
  );

  const renderRate = useCallback(
    (rate) => (
      <View style={styles.row}>
        <Avatar
          variant={AvatarVariant.Icon}
          size={AvatarSize.Md}
          style={styles.badgeWrapper}
          name={IconName.SwapHorizontal}
          backgroundColor={theme.colors.success.muted}
          iconColor={IconColor.Success}
        />
        <View style={styles.boxLeft}>
          <Text variant={TextVariant.BodyLGMedium}>
            {strings('notifications.rate')}
          </Text>
          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
            {rate}
          </Text>
        </View>
      </View>
    ),
    [
      styles.badgeWrapper,
      styles.boxLeft,
      styles.row,
      theme.colors.success.muted,
    ],
  );

  const renderSwap = useCallback(
    (notificationDetails) => {
      const {
        type,
        status,
        tx_hash,
        token_in,
        token_out,
        rate,
        badgeIcon,
        network,
      } = notificationDetails as Record<string, any>;

      return (
        <>
          {renderAddress({
            key: 'from',
            address: from, // TODO: change from and to to request_id ???
            actionType: type,
          })}
          {renderAsset({
            type,
            title: strings('notifications.swap'),
            token_in,
            badgeIcon,
            network,
          })}
          {renderAsset({
            type,
            title: strings('notifications.to'),
            token_out,
            badgeIcon,
            network,
          })}
          {renderStatus(status, tx_hash)}
          {renderRate(rate)}
          {renderNetwork(network)}
        </>
      );
    },
    [renderAddress, renderAsset, renderNetwork, renderRate, renderStatus],
  );

  return {
    renderNFT,
    renderTransfer,
    renderStake,
    renderStakeReadyToBeWithdrawn,
    renderSwap,
  };
};

export default useDetails;
