import React from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { useTheme } from '../../../util/theme';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { formatWithThreshold } from '../../../util/assets';
import I18n, { strings } from '../../../../locales/i18n';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../component-library/components/Texts/SensitiveText';
import DeFiAvatarWithBadge from './DeFiAvatarWithBadge';
import styleSheet from './DeFiProtocolPositionTypeGroupDetails.styles';
import { PositionType } from './position-types';

interface DeFiProtocolPositionTypeGroupDetailsProps {
  positionType: PositionType;
  tokens: {
    name: string;
    symbol: string;
    iconUrl: string;
    balance: number;
    marketValue: number | undefined;
  }[];
  networkIconAvatar: ImageSourcePropType | undefined;
  privacyMode: boolean;
}

const DeFiProtocolPositionTypeGroupDetails: React.FC<
  DeFiProtocolPositionTypeGroupDetailsProps
> = ({
  positionType,
  tokens,
  networkIconAvatar,
  privacyMode,
}: DeFiProtocolPositionTypeGroupDetailsProps) => {
  const theme = useTheme();
  const styles = styleSheet({ theme });

  if (tokens.length === 0) {
    return null;
  }

  return (
    <View>
      <Text style={styles.positionTypeLabel} variant={TextVariant.BodyMDMedium}>
        {strings(`defi_positions.${positionType}`)}
      </Text>
      {tokens.map((token, i) => (
        <View key={i} style={styles.underlyingBalancesWrapper}>
          <View>
            <DeFiAvatarWithBadge
              networkIconAvatar={networkIconAvatar}
              avatarName={token.name}
              avatarIconUrl={token.iconUrl}
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
              isHidden={privacyMode}
              length={SensitiveTextLength.Short}
              style={styles.alternativeText}
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

export default DeFiProtocolPositionTypeGroupDetails;
