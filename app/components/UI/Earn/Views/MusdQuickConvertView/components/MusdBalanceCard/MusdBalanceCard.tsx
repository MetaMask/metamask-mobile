import React from 'react';
import { View, Image } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import Badge, {
  BadgeVariant,
} from '../../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../../component-library/components/Badges/BadgeWrapper';
import { AvatarSize } from '../../../../../../../component-library/components/Avatars/Avatar';
import { useStyles } from '../../../../../../hooks/useStyles';
import { strings } from '../../../../../../../../locales/i18n';
import { MUSD_CONVERSION_APY, MUSD_TOKEN } from '../../../../constants/musd';
import { getNetworkImageSource } from '../../../../../../../util/networks';
import styleSheet from './MusdBalanceCard.styles';
import { Hex } from '@metamask/utils';

/**
 * Test IDs for the MusdBalanceCard component.
 */
export const MusdBalanceCardTestIds = {
  CONTAINER: 'musd-balance-card',
  TOKEN_ICON: 'musd-token-icon',
} as const;

interface MusdBalanceCardProps {
  chainId: Hex;
  balance: string;
}

const MusdBalanceCard = ({ chainId, balance }: MusdBalanceCardProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container} testID={MusdBalanceCardTestIds.CONTAINER}>
      <View style={styles.left}>
        <View style={styles.tokenIconContainer}>
          <BadgeWrapper
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                imageSource={getNetworkImageSource({
                  chainId,
                })}
                isScaled={false}
                size={AvatarSize.Xs}
              />
            }
          >
            <Image
              source={MUSD_TOKEN.imageSource}
              style={styles.tokenIcon}
              testID={MusdBalanceCardTestIds.TOKEN_ICON}
            />
          </BadgeWrapper>
        </View>
        <View>
          <Text variant={TextVariant.BodyMDMedium}>{balance}</Text>
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >
            {MUSD_TOKEN.symbol}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Success}>
          {strings('earn.musd_conversion.percentage_boost', {
            percentage: MUSD_CONVERSION_APY,
          })}
        </Text>
      </View>
    </View>
  );
};

export default MusdBalanceCard;
