import React from 'react';
import {
  StyleSheet,
  ImageSourcePropType,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import TokenIcon from '../../../Base/TokenIcon';
import { Box } from '../../Box/Box';
import { AlignItems, FlexDirection } from '../../Box/box.types';
import { useStyles } from '../../../../component-library/hooks';
import { Theme } from '../../../../util/theme/models';
import { BridgeToken } from '../types';
import { ethers } from 'ethers';
import { fontStyles } from '../../../../styles/common';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
} from '../../Tokens/constants';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { getAssetTestId } from '../../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';
import { useSelector } from 'react-redux';
import { selectNoFeeAssets } from '../../../../core/redux/slices/bridge';
import { strings } from '../../../../../locales/i18n';
import TagBase, {
  TagShape,
  TagSeverity,
} from '../../../../component-library/base-components/TagBase';
import Tag from '../../../../component-library/components/Tags/Tag';
import { RootState } from '../../../../reducers';
import { ACCOUNT_TYPE_LABELS } from '../../../../constants/account-type-labels';
import parseAmount from '../../../../util/parseAmount';

const createStyles = ({
  theme,
  vars,
}: {
  theme: Theme;
  vars: { isSelected: boolean };
}) =>
  StyleSheet.create({
    tokenInfo: {
      flex: 1,
      marginLeft: 8,
    },
    container: {
      backgroundColor: vars.isSelected
        ? theme.colors.primary.muted
        : theme.colors.background.default,
      padding: 4,
    },
    selectedIndicator: {
      width: 4,
      height: '100%',
      borderRadius: 8,
      backgroundColor: theme.colors.primary.default,
    },
    itemWrapper: {
      flex: 1,
      flexDirection: 'row',
      paddingHorizontal: 15,
      paddingVertical: 10,
      alignItems: 'flex-start',
    },
    balance: {
      flex: 1,
      alignItems: 'flex-end',
    },
    skeleton: {
      width: 50,
      padding: 8,
      borderRadius: 30,
      backgroundColor: theme.colors.background.alternative,
    },
    secondaryBalance: {
      color: theme.colors.text.alternative,
      paddingHorizontal: 0,
      ...fontStyles.normal,
      textTransform: 'uppercase',
    },
    badgeWrapper: {
      // override the BadgeWrapper alignSelf: 'flex-start', let parent control the alignment
      alignSelf: undefined,
    },
    noFeeBadge: {
      marginLeft: 8,
      paddingHorizontal: 6,
    },
    selectedItemWrapperReset: {
      marginLeft: -4,
    },
    nativeTokenIcon: {
      width: 32,
      height: 32,
    },
  });

interface TokenSelectorItemProps {
  token: BridgeToken;
  onPress: (token: BridgeToken) => void;
  networkName: string;
  networkImageSource?: ImageSourcePropType;
  isSelected?: boolean;
  shouldShowBalance?: boolean;
  children?: React.ReactNode;
}

export const TokenSelectorItem: React.FC<TokenSelectorItemProps> = ({
  token,
  onPress,
  networkName,
  networkImageSource,
  isSelected = false,
  shouldShowBalance = true,
  children,
}) => {
  const { styles } = useStyles(createStyles, { isSelected });
  const noFeeAssets = useSelector((state: RootState) =>
    selectNoFeeAssets(state, token.chainId),
  );

  const isNoFeeAsset = noFeeAssets?.includes(token.address);

  const fiatValue = token.balanceFiat;

  const formatTokenBalance = (balance: string): string => {
    const numericBalance = Number(balance);
    if (numericBalance === 0) {
      return '0';
    }
    if (numericBalance < 0.00001) {
      return '< 0.00001';
    }
    return parseAmount(balance, 5) || balance;
  };

  const balanceWithSymbol = token.balance
    ? `${formatTokenBalance(token.balance)} ${token.symbol}`
    : undefined;

  const isNative = token.address === ethers.constants.AddressZero;

  const balance = shouldShowBalance ? fiatValue : undefined;
  const secondaryBalance = shouldShowBalance ? balanceWithSymbol : undefined;

  const label = token.accountType
    ? ACCOUNT_TYPE_LABELS[token.accountType]
    : undefined;

  return (
    <Box
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      style={styles.container}
    >
      {isSelected && <View style={styles.selectedIndicator} />}

      <TouchableOpacity
        key={token.address}
        onPress={() => onPress(token)}
        style={styles.itemWrapper}
        {...generateTestId(
          Platform,
          getAssetTestId(`${token.chainId}-${token.symbol}`),
        )}
      >
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={4}
          style={isSelected ? styles.selectedItemWrapperReset : {}}
        >
          {/* Token Icon */}
          <BadgeWrapper
            style={styles.badgeWrapper}
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                name={networkName}
                imageSource={networkImageSource}
              />
            }
          >
            {isNative ? (
              <TokenIcon
                symbol={token.symbol}
                icon={token.image}
                medium
                style={styles.nativeTokenIcon}
                testID={`network-logo-${token.symbol}`}
              />
            ) : (
              <AvatarToken
                name={token.symbol}
                imageSource={token.image ? { uri: token.image } : undefined}
                size={AvatarSize.Md}
              />
            )}
          </BadgeWrapper>

          {/* Token symbol and name */}
          <Box
            style={styles.tokenInfo}
            flexDirection={FlexDirection.Column}
            gap={4}
          >
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              gap={4}
            >
              <Text variant={TextVariant.BodyLGMedium}>{token.symbol}</Text>
              {label && <Tag label={label} />}
              {isNoFeeAsset && (
                <TagBase
                  shape={TagShape.Rectangle}
                  severity={TagSeverity.Info}
                  textProps={{ variant: TextVariant.BodyXS }}
                  style={styles.noFeeBadge}
                >
                  {strings('bridge.no_mm_fee')}
                </TagBase>
              )}
            </Box>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {token.name}
            </Text>
          </Box>

          {/* Token balance and fiat value */}
          <Box style={styles.balance} gap={4}>
            {balance &&
              (balance === TOKEN_BALANCE_LOADING ||
              balance === TOKEN_BALANCE_LOADING_UPPERCASE ? (
                <View style={styles.skeleton} />
              ) : (
                <Text variant={TextVariant.BodyLGMedium}>{balance}</Text>
              ))}
            {secondaryBalance ? (
              secondaryBalance === TOKEN_BALANCE_LOADING ||
              secondaryBalance === TOKEN_BALANCE_LOADING_UPPERCASE ? (
                <View style={styles.skeleton} />
              ) : (
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {secondaryBalance}
                </Text>
              )
            ) : null}
          </Box>
        </Box>
      </TouchableOpacity>

      {children}
    </Box>
  );
};
