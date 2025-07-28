import React from 'react';
import { ImageSourcePropType, View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { formatWithThreshold } from '../../../util/assets';
import I18n, { strings } from '../../../../locales/i18n';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../component-library/components/Texts/SensitiveText';
import DeFiAvatarWithBadge from './DeFiAvatarWithBadge';
import styleSheet from './DeFiProtocolPositionGroupTokens.styles';
import { PositionType } from './position-types';
import { useStyles } from '../../hooks/useStyles';
import { getTokenAvatarUrl } from './get-token-avatar-url';

interface DeFiProtocolPositionGroupTokensProps {
  positionType: PositionType;
  tokens: {
    key: string;
    address: string;
    name: string;
    symbol: string;
    iconUrl: string;
    balance: number;
    marketValue: number | undefined;
  }[];
  networkIconAvatar: ImageSourcePropType | undefined;
  privacyMode: boolean;
}

const DeFiProtocolPositionGroupTokens: React.FC<
  DeFiProtocolPositionGroupTokensProps
> = ({
  positionType,
  tokens,
  networkIconAvatar,
  privacyMode,
}: DeFiProtocolPositionGroupTokensProps) => {
  const { styles } = useStyles(styleSheet, undefined);

  if (tokens.length === 0) {
    return null;
  }

  return (
    <View>
      <Text variant={TextVariant.BodyMDMedium} color={TextColor.Alternative}>
        {strings(`defi_positions.${positionType}`)}
      </Text>
      {tokens.map((token) => (
        <View key={token.key} style={styles.underlyingBalancesWrapper}>
          <View>
            <DeFiAvatarWithBadge
              networkIconAvatar={networkIconAvatar}
              avatarName={token.name}
              avatarIconUrl={getTokenAvatarUrl(token)}
            />
          </View>

          <Text
            style={styles.assetSymbolText}
            variant={TextVariant.BodyMDMedium}
          >
            {token.symbol}
          </Text>

          <View style={styles.balance}>
            <SensitiveText
              variant={TextVariant.BodyMDMedium}
              isHidden={privacyMode}
              length={SensitiveTextLength.Medium}
            >
              {token.marketValue
                ? formatWithThreshold(token.marketValue, 0.01, I18n.locale, {
                    style: 'currency',
                    currency: 'USD',
                  })
                : null}
            </SensitiveText>
            <SensitiveText
              variant={TextVariant.BodySMMedium}
              color={TextColor.Alternative}
              isHidden={privacyMode}
              length={SensitiveTextLength.Short}
            >
              {formatWithThreshold(token.balance, 0.00001, I18n.locale, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 5,
              })}{' '}
              {token.symbol}
            </SensitiveText>
          </View>
        </View>
      ))}
    </View>
  );
};

export default DeFiProtocolPositionGroupTokens;
