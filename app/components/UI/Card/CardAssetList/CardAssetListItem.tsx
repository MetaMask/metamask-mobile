import { StyleProp, View, ViewStyle } from 'react-native';
import { AllowanceState, TokenConfig } from '../card.utils';
import React, { useCallback } from 'react';
import { useTheme } from '../../../../util/theme';
import createStyles from './styles';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import Tag from '../../../../component-library/components/Tags/Tag';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import { useSelector } from 'react-redux';
import SensitiveText from '../../../../component-library/components/Texts/SensitiveText';

const CardAssetListItem: React.FC<{
  token: TokenConfig;
}> = ({ token }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const privacyMode = useSelector(selectPrivacyMode);

  const renderNetworkAvatar = useCallback(() => {
    if (!token) {
      return null;
    }

    return <AvatarToken name={token.symbol} size={AvatarSize.Md} />;
  }, [token]);

  const renderChip = useCallback(() => {
    const tagConfig: Record<
      AllowanceState,
      { label: string; style?: StyleProp<ViewStyle> }
    > = {
      [AllowanceState.Delegatable]: {
        label: 'Delegatable',
      },
      [AllowanceState.Unlimited]: {
        label: 'Enabled',
        style: { backgroundColor: colors.success.muted },
      },
      [AllowanceState.Limited]: {
        label: 'Spend Limited',
        style: { backgroundColor: colors.warning.muted },
      },
    };

    const { label, style } = tagConfig[token.allowanceState];
    return <Tag label={label} style={style} />;
  }, [token, colors]);

  return (
    <View key={token.address} style={styles.tokenItem}>
      <View style={styles.tokenInfo}>
        {renderNetworkAvatar()}
        <View style={styles.tokenDetails}>
          <Text variant={TextVariant.BodyMD} style={styles.tokenSymbol}>
            {token.symbol}
          </Text>
          <Text variant={TextVariant.BodySM} style={styles.tokenName}>
            {renderChip()}
          </Text>
        </View>
      </View>
      <View>
        <SensitiveText
          isHidden={privacyMode}
          variant={TextVariant.BodyMD}
          style={styles.tokenSymbol}
        >
          {token.balance}
        </SensitiveText>
      </View>
    </View>
  );
};

export default CardAssetListItem;
