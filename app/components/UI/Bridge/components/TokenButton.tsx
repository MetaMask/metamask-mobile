import React from 'react';
import {
  StyleSheet,
  ImageSourcePropType,
  TouchableOpacity,
  View,
} from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { Theme } from '../../../../util/theme/models';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import TokenIcon from '../../../Base/TokenIcon';
import type { CaipAssetType } from '@metamask/utils';
import SwapsTokenSecurityBadge from './SwapsTokenSecurityBadge';
import MoneyIcon from '../../../../images/money-icon.svg';
import { strings } from '../../../../../locales/i18n';

interface TokenProps {
  symbol?: string;
  iconUrl?: string;
  networkImageSource?: ImageSourcePropType;
  networkName?: string;
  testID?: string;
  onPress?: () => void;
  securityBadgeAssetId?: CaipAssetType;
  isMoneyToken?: boolean;
}

interface StylesParams {
  theme: Theme;
}

const createStyles = (params: StylesParams) => {
  const { theme } = params;
  const { shadows } = theme;
  return StyleSheet.create({
    icon: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    pillContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'flex-end' as const,
      gap: 12,
      backgroundColor: theme.colors.background.muted,
      borderRadius: 60,
      paddingLeft: 8,
      paddingVertical: 8,
      paddingRight: 12,
      ...shadows.size.xs,
    },
    tokenSymbol: {
      color: theme.colors.text.default,
      fontSize: theme.typography.sHeadingMD.fontSize,
      fontWeight: 500,
    },
    tokenSymbolRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
  });
};

export const TokenButton: React.FC<TokenProps> = ({
  symbol,
  iconUrl,
  networkImageSource,
  networkName,
  testID,
  onPress,
  securityBadgeAssetId,
  isMoneyToken = false,
}) => {
  const { styles } = useStyles(createStyles, {});

  return (
    <TouchableOpacity
      onPress={onPress}
      testID={testID}
      style={styles.pillContainer}
    >
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          !isMoneyToken && (
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkImageSource}
              name={networkName}
            />
          )
        }
      >
        {isMoneyToken ? (
          <MoneyIcon
            width={styles.icon.width}
            height={styles.icon.height}
            testID="money-token-icon"
            name="MoneyIcon"
          />
        ) : (
          <TokenIcon symbol={symbol} icon={iconUrl} style={styles.icon} />
        )}
      </BadgeWrapper>

      <View style={styles.tokenSymbolRow}>
        <Text style={styles.tokenSymbol} variant={TextVariant.HeadingMD}>
          {isMoneyToken ? strings('money.title') : symbol}
        </Text>
        {securityBadgeAssetId ? (
          <SwapsTokenSecurityBadge caipAssetId={securityBadgeAssetId} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
};
