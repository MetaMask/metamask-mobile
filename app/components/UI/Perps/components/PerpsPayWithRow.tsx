import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import BadgeNetwork from '../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import ListItem from '../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextColor,
  TextVariant
} from '../../../../component-library/components/Texts/Text';
import { getNetworkImageSource, BLOCKAID_SUPPORTED_NETWORK_NAMES } from '../../../../util/networks';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import type { PerpsToken } from './PerpsTokenSelector';

interface PerpsPayWithRowProps {
  selectedToken: PerpsToken;
  tokenAmount: string;
  onPress: () => void;
  testID?: string;
  showUsdEquivalent?: boolean;
  usdEquivalent?: string;
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
      marginVertical: 8,
    },
    tokenSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });

const PerpsPayWithRow: React.FC<PerpsPayWithRowProps> = ({
  selectedToken,
  tokenAmount,
  onPress,
  testID = 'perps-pay-with-row',
  showUsdEquivalent = false,
  usdEquivalent,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Get network information
  const networkImageSource = getNetworkImageSource({
    chainId: selectedToken.chainId || '0x1',
  });

  // Get network name using MetaMask's network utilities
  const getNetworkName = (chainId: string): string =>
    BLOCKAID_SUPPORTED_NETWORK_NAMES[chainId] || 'Unknown Network';

  const networkName = getNetworkName(selectedToken.chainId || '0x1');

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      testID={testID}
    >
      <ListItem gap={8}>
        <ListItemColumn widthType={WidthType.Fill}>
          <Text variant={TextVariant.BodyMD}>
            {strings('perps.deposit.payWith')}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Alternative}
          >
            {tokenAmount} {selectedToken.symbol}
          </Text>
          {showUsdEquivalent && usdEquivalent && (
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Muted}
              testID={`${testID}-usd-equivalent`}
            >
              ≈ {usdEquivalent}
            </Text>
          )}
        </ListItemColumn>

        <ListItemColumn>
          <View style={styles.tokenSelector}>
            <BadgeWrapper
              badgePosition={BadgePosition.BottomRight}
              badgeElement={
                <BadgeNetwork
                  name={networkName}
                  imageSource={networkImageSource}
                />
              }
            >
              <AvatarToken
                name={selectedToken.name || selectedToken.symbol}
                imageSource={selectedToken.iconUrl ? { uri: selectedToken.iconUrl } : undefined}
                size={AvatarSize.Md}
              />
            </BadgeWrapper>
            <Text variant={TextVariant.BodyMD}>
              {selectedToken.symbol}
            </Text>
          </View>
        </ListItemColumn>

        <ListItemColumn>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Md}
            color={colors.icon.alternative}
          />
        </ListItemColumn>
      </ListItem>
    </TouchableOpacity>
  );
};

export default PerpsPayWithRow;
