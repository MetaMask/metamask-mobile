import React from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { Tag, TagSeverity } from '@metamask/design-system-react-native';
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

export const DEFI_DETAILS_POSITION_TYPE_TAG_TEST_ID =
  'defi-details-position-type-tag';

interface DeFiProtocolPositionGroupTokensProps {
  /** Group-level position-type label (V1). Omit to hide the section header. */
  positionType?: PositionType;
  tokens: {
    key: string;
    address: string;
    name: string;
    symbol: string;
    iconUrl: string;
    balance: number;
    marketValue: number | undefined;
    /** Per-token position type tag (V2). Shown next to the symbol when present. */
    positionType?: string;
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
      {positionType ? (
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Alternative}>
          {strings(`defi_positions.${positionType}`)}
        </Text>
      ) : null}
      {tokens.map((token) => (
        <View key={token.key} style={styles.underlyingBalancesWrapper}>
          <View>
            <DeFiAvatarWithBadge
              networkIconAvatar={networkIconAvatar}
              avatarName={token.name}
              avatarIconUrl={getTokenAvatarUrl(token)}
            />
          </View>

          <View style={styles.assetInfo}>
            <Text
              style={styles.assetSymbolText}
              variant={TextVariant.BodyMDMedium}
              numberOfLines={1}
            >
              {token.symbol}
            </Text>
            {token.positionType ? (
              <Tag
                severity={TagSeverity.Neutral}
                testID={DEFI_DETAILS_POSITION_TYPE_TAG_TEST_ID}
              >
                {token.positionType}
              </Tag>
            ) : null}
          </View>

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
