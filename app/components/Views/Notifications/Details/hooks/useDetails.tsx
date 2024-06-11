import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useSelector } from 'react-redux';

import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import RemoteImage from '../../../../Base/RemoteImage';
import NftFallbackImage from '../../../../../../docs/assets/nft-fallback.png';
import Avatar, {
  AvatarAccountType,
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import EthereumAddress from '../../../../UI/EthereumAddress';

import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectContractExchangeRates } from '../../../../../selectors/tokenRatesController';

import { balanceToFiat } from '../../../../../util/number';

import {
  TRIGGER_TYPES,
  TxStatus,
  returnAvatarProps,
  STAKING_PROVIDER_MAP,
} from '../../../../../util/notifications';

import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { createStyles } from '../styles';
import { Theme } from '../../../../../util/theme/models';
import NotificationBadge from '../Badge';
import BadgeWrapper from '../../../../../component-library/components/Badges/BadgeWrapper';
import { DEFAULT_BADGEWRAPPER_BADGEPOSITION } from '../../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';

interface UseDetailsProps {
  theme: Theme;
  accountAvatarType?: AvatarAccountType;
  navigation: any;
  copyToClipboard: (type: string, selectedString?: string) => Promise<void>;
}

const useDetails = ({
  theme,
  accountAvatarType,
  navigation,
  copyToClipboard,
}: UseDetailsProps) => {
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
        (actionType?.includes('received') && key === 'from') ||
        (actionType?.includes('sent') && key === 'to');
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
    [
      copyToClipboard,
      styles.badgeWrapper,
      styles.boxLeft,
      styles.copyIconRight,
      styles.copyTextBtn,
      styles.rightSection,
      styles.row,
      theme,
    ],
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
    (collection, network) => (
      <View style={styles.row}>
        <BadgeWrapper
          badgePosition={DEFAULT_BADGEWRAPPER_BADGEPOSITION}
          badgeElement={
            <RemoteImage
              source={{
                uri:
                  network.image ||
                  'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg',
              }}
            />
          }
          style={styles.badgeWrapper}
        >
          <RemoteImage
            source={{
              uri: collection.image,
            }}
            style={styles.nftLogo}
            placeholderStyle={styles.nftPlaceholder}
          />
        </BadgeWrapper>
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
    (type, title, token, network) => {
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
            badgeImageSource={network.image}
            imageUrl={token.image}
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
      const { type, nft, from, to, status, tx_hash, collection, network } =
        notificationDetails as Record<string, any>;
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
          {renderCollection(collection, network)}
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
      const { type, from, to, status, tx_hash, token, network } =
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
          {renderAsset(type, strings('transaction.asset'), token, network)}
          {renderStatus(status, tx_hash)}
          {renderNetwork(network)}
        </>
      );
    },
    [renderAddress, renderAsset, renderNetwork, renderStatus],
  );

  const renderStakeProvider = useCallback(
    (type, stake_in) => {
      //@ts-expect-error most of this types will be refactored to be using sharedlibrary ones.
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
      const { type, status, tx_hash, stake_in, stake_out, network } =
        notificationDetails as Record<string, any>;
      const unstakingInProgress =
        type?.indexOf(TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED) > -1;

      if (unstakingInProgress) {
        return;
      }

      return (
        <>
          {/*
          // TODO: At the moment, we don’t show this data in the UI.
          The backend team is working to include this information in the notifications API
          {renderAddress({
            key: 'from',
            address: from,
            actionType: type,
          })} */}
          {renderAsset(
            type,
            strings('notifications.staked'),
            stake_in,
            network,
          )}
          {renderAsset(
            type,
            strings('notifications.received'),
            stake_out,
            network,
          )}
          {renderStatus(status, tx_hash)}
          {renderStakeProvider(type, stake_in)}
        </>
      );
    },
    [renderAsset, renderStakeProvider, renderStatus],
  );

  const renderStakeReadyToBeWithdrawn = useCallback(
    (notificationDetails) => {
      const { type, staked_eth, tx_hash, status, network } =
        notificationDetails as Record<string, any>;

      return (
        <>
          {/*
          // TODO: At the moment, we don’t show this data in the UI.
          The backend team is working to include this information in the notifications API
          {renderAddress({
            key: 'from',
            address: from, // TODO: how to get from in a stake?
            actionType: type,
          })} */}
          {renderStatus(status, tx_hash)}
          {renderAsset(
            type,
            strings('notifications.unstaking_requested'),
            staked_eth,
            network,
          )}
          {renderStakeProvider(type, staked_eth)}
        </>
      );
    },
    [renderAsset, renderStakeProvider, renderStatus],
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
      const { type, status, tx_hash, token_in, token_out, rate, network } =
        notificationDetails as Record<string, any>;
      // TODO: on next change from API we need to use render the account involved on the swap.
      return (
        <>
          {renderAsset(type, strings('notifications.swap'), token_in, network)}
          {renderAsset(type, strings('notifications.to'), token_out, network)}
          {renderStatus(status, tx_hash)}
          {renderRate(rate)}
          {renderNetwork(network)}
        </>
      );
    },
    [renderAsset, renderNetwork, renderRate, renderStatus],
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
