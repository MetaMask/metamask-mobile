import React, { useCallback } from 'react';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import {
  Image,
  TouchableHighlight,
  TextStyle,
  ViewStyle,
  useColorScheme,
} from 'react-native';
import { Transaction, TransactionType } from '@metamask/keyring-api';
import { useTheme } from '../../../util/theme';
import ListItem from '../../Base/ListItem';
import StatusText from '../../Base/StatusText';
import { getTransactionIcon } from '../../../util/transaction-icons';
import { toDateFormat } from '../../../util/date';
import { useMultichainTransactionDisplay } from '../../hooks/useMultichainTransactionDisplay';
import styles from './MultichainTransactionListItem.styles';
import { useSelector } from 'react-redux';
import { RootState } from '../../../reducers';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import {
  BadgePosition,
  BadgePositionCustom,
} from '../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import { getNetworkImageSource } from '../../../util/networks';
import Routes from '../../../constants/navigation/Routes';
import {
  AvatarToken,
  AvatarTokenSize,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import type { ImageOrSvgSrc } from '@metamask/design-system-react-native/dist/components/temp-components/ImageOrSvg';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import {
  TRANSACTION_DETAIL_EVENTS,
  TransactionDetailLocation,
} from '../../../core/Analytics/events/transactions';

function toAvatarTokenSize(px?: number): AvatarTokenSize {
  if (px === 24) return AvatarTokenSize.Sm;
  if (px === 40) return AvatarTokenSize.Lg;
  if (px === 48) return AvatarTokenSize.Xl;
  return AvatarTokenSize.Md;
}

const MultichainTransactionListItem = ({
  transaction,
  chainId,
  navigation,
  index,
  location,
  hideDate,
  iconSize,
  badgePosition,
  description,
  tokenIconSource,
  containerStyle,
  hideSubtitle,
  textStyles,
  fiatAmount,
  displayAmountOverride,
  hideBorder,
}: {
  transaction: Transaction;
  chainId: SupportedCaipChainId;
  navigation: AppNavigationProp;
  index?: number;
  location?: TransactionDetailLocation;
  hideDate?: boolean;
  iconSize?: number;
  badgePosition?: BadgePosition | BadgePositionCustom;
  description?: string;
  tokenIconSource?: ImageOrSvgSrc;
  containerStyle?: ViewStyle;
  hideSubtitle?: boolean;
  textStyles?: {
    title?: TextStyle;
    subtitle?: TextStyle;
    amount?: TextStyle;
    fiatAmount?: TextStyle;
  };
  fiatAmount?: string;
  displayAmountOverride?: string;
  hideBorder?: boolean;
}) => {
  const { colors, typography } = useTheme();
  const osColorScheme = useColorScheme();
  const appTheme = useSelector((state: RootState) => state.user.appTheme);
  const { trackEvent, createEventBuilder } = useAnalytics();

  const displayData = useMultichainTransactionDisplay(transaction, chainId);
  const { title, to, priorityFee, baseFee, isRedeposit } = displayData;

  const handlePress = useCallback(() => {
    trackEvent(
      createEventBuilder(TRANSACTION_DETAIL_EVENTS.LIST_ITEM_CLICKED)
        .addProperties({
          transaction_type: transaction.type?.toLowerCase() ?? 'unknown',
          transaction_status: transaction.status ?? 'unknown',
          location: location ?? TransactionDetailLocation.Home,
          chain_id_source: String(chainId),
          chain_id_destination: String(chainId),
        })
        .build(),
    );

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.MULTICHAIN_TRANSACTION_DETAILS,
      params: { displayData, transaction },
    });
  }, [
    navigation,
    displayData,
    transaction,
    chainId,
    location,
    trackEvent,
    createEventBuilder,
  ]);

  const style = styles(colors, typography);

  const renderTxElementIcon = (transactionType: string) => {
    const networkImageSource = getNetworkImageSource({ chainId });

    if (tokenIconSource) {
      return (
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkImageSource}
            />
          }
        >
          <AvatarToken
            src={tokenIconSource}
            name="token"
            size={toAvatarTokenSize(iconSize)}
          />
        </BadgeWrapper>
      );
    }

    const isFailedTransaction = transaction.status === 'failed';
    const icon = getTransactionIcon(
      transactionType.toLowerCase(),
      isFailedTransaction,
      appTheme,
      osColorScheme,
    );

    const iconStyle = iconSize
      ? { width: iconSize, height: iconSize }
      : style.icon;

    return (
      <BadgeWrapper
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            imageSource={networkImageSource}
          />
        }
        {...(badgePosition ? { badgePosition } : {})}
      >
        <Image source={icon} style={iconStyle} resizeMode="stretch" />
      </BadgeWrapper>
    );
  };

  const displayAmount = () => {
    if (isRedeposit) {
      return `${priorityFee?.amount} ${priorityFee?.unit}`;
    }

    if (transaction.type === TransactionType.Unknown) {
      return `${baseFee?.amount} ${baseFee?.unit}`;
    }

    return `${to?.amount} ${to?.unit}`;
  };

  return (
    <TouchableHighlight
      style={[
        style.itemContainer,
        { borderBottomColor: colors.border.muted },
        hideBorder && style.itemContainerNoBorder,
      ]}
      onPress={handlePress}
      underlayColor={colors.background.alternative}
      activeOpacity={1}
      testID={`transaction-item-${index ?? 0}`}
    >
      <ListItem style={containerStyle}>
        {!hideDate && (
          <ListItem.Date style={style.listItemDate}>
            {transaction.timestamp &&
              toDateFormat(new Date(transaction.timestamp * 1000))}
          </ListItem.Date>
        )}
        <ListItem.Content
          style={[
            style.listItemContent,
            (hideSubtitle || fiatAmount) && { alignItems: 'center' as const },
          ]}
        >
          <ListItem.Icon>
            {renderTxElementIcon(isRedeposit ? 'redeposit' : transaction.type)}
          </ListItem.Icon>
          <ListItem.Body>
            <ListItem.Title
              numberOfLines={1}
              style={[style.listItemTitle, textStyles?.title] as TextStyle[]}
            >
              {title}
            </ListItem.Title>
            {!hideSubtitle &&
              (description !== undefined ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  style={
                    textStyles?.subtitle as unknown as Record<string, unknown>
                  }
                >
                  {description}
                </Text>
              ) : (
                <StatusText
                  testID={`transaction-status-${transaction.id}`}
                  status={transaction.status}
                  style={
                    [style.listItemStatus, textStyles?.subtitle] as TextStyle[]
                  }
                  context="transaction"
                />
              ))}
          </ListItem.Body>
          <ListItem.Amounts>
            <ListItem.Amount
              style={[style.listItemAmount, textStyles?.amount] as TextStyle[]}
            >
              {displayAmountOverride ?? displayAmount()}
            </ListItem.Amount>
            {!!fiatAmount && (
              <ListItem.FiatAmount
                style={
                  [
                    style.listItemFiatAmount,
                    textStyles?.fiatAmount,
                  ] as TextStyle[]
                }
              >
                {fiatAmount}
              </ListItem.FiatAmount>
            )}
          </ListItem.Amounts>
        </ListItem.Content>
      </ListItem>
    </TouchableHighlight>
  );
};

export default MultichainTransactionListItem;
