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
import { useABTest } from '../../../../hooks';
import {
  BRIDGE_TOKEN_SELECTOR_VERIFIED_BADGE_AB_KEY,
  BRIDGE_TOKEN_SELECTOR_VERIFIED_BADGE_VARIANTS,
} from './TokenButton.abTestConfig';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';

interface TokenProps {
  symbol?: string;
  iconUrl?: string;
  networkImageSource?: ImageSourcePropType;
  networkName?: string;
  testID?: string;
  onPress?: () => void;
  isVerified?: boolean;
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
      borderRadius: 100,
      paddingLeft: 8,
      paddingVertical: 8,
      paddingRight: 11,
      ...shadows.size.xs,
    },
    tokenSymbol: {
      color: theme.colors.text.default,
      fontSize: theme.typography.sHeadingLG.fontSize,
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
  isVerified,
}) => {
  const { styles } = useStyles(createStyles, {});
  const { variant } = useABTest(
    BRIDGE_TOKEN_SELECTOR_VERIFIED_BADGE_AB_KEY,
    BRIDGE_TOKEN_SELECTOR_VERIFIED_BADGE_VARIANTS,
  );
  const shouldShowVerifiedBadge = isVerified && variant.showVerifiedBadge;

  return (
    <TouchableOpacity
      onPress={onPress}
      testID={testID}
      style={styles.pillContainer}
    >
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            imageSource={networkImageSource}
            name={networkName}
          />
        }
      >
        <TokenIcon symbol={symbol} icon={iconUrl} style={styles.icon} />
      </BadgeWrapper>

      <View style={styles.tokenSymbolRow}>
        <Text style={styles.tokenSymbol} variant={TextVariant.HeadingLG}>
          {symbol}
        </Text>
        {shouldShowVerifiedBadge ? (
          <Icon
            testID={`token-verified-icon-${symbol}`}
            name={IconName.VerifiedFilled}
            size={IconSize.Sm}
            color={IconColor.InfoDefault}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
};
