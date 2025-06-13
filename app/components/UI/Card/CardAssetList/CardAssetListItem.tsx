import { View } from 'react-native';
import { TokenConfig } from '../../Tokens/TokenList/PortfolioBalance/card.utils';
import React, { useCallback } from 'react';
import { useTheme } from '../../../../util/theme';
import createStyles from './styles';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import Tag from '../../../../component-library/components/Tags/Tag';

const CardAssetListItem: React.FC<{
  token: TokenConfig;
}> = ({ token }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const allowance =
    token.usAllowance !== '0' ? token.usAllowance : token.globalAllowance;

  const renderNetworkAvatar = useCallback(() => {
    if (!token) {
      return null;
    }

    return <AvatarToken name={token.symbol} size={AvatarSize.Md} />;
  }, [token]);

  const renderChip = useCallback(() => {
    if (allowance === '0') {
      return <Tag label="Delegatable" />;
    }

    // unlimited allowance is set to maximum value.
    // set an arbitrary number to represent unlimited allowance
    if (parseInt(allowance) > 99999999999) {
      return (
        <Tag
          label="Enabled"
          style={{
            backgroundColor: colors.success.muted,
          }}
        />
      );
    }

    return (
      <Tag
        label={`Limited to ${allowance} ${token.symbol}`}
        style={{
          backgroundColor: colors.warning.muted,
        }}
      />
    );
  }, [allowance, token.symbol, colors]);

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
        <Text variant={TextVariant.BodyMD} style={styles.tokenSymbol}>
          {token.balance}
        </Text>
      </View>
    </View>
  );
};

export default CardAssetListItem;
