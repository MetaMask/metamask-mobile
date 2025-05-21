import React from 'react';
import styleSheet from './EarnWithdrawalTokenListItem.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { EarnNetworkAvatar } from '../EarnDepositTokenListItem';
import { TouchableOpacity, View } from 'react-native';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { selectNetworkName } from '../../../../../selectors/networkInfos';
import { useSelector } from 'react-redux';
import { getNetworkImageSource } from '../../../../../util/networks';
import { strings } from '../../../../../../locales/i18n';
import { EarnTokenDetails } from '../../hooks/useEarnTokenDetails';

export interface EarnWithdrawalTokenListItemProps {
  earnToken: EarnTokenDetails;
  onPress: (earnToken: EarnTokenDetails) => void;
}

const EarnWithdrawalTokenListItem = ({
  earnToken,
  onPress,
}: EarnWithdrawalTokenListItemProps) => {
  const { styles } = useStyles(styleSheet, {});

  const networkName = useSelector(selectNetworkName);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(earnToken)}
    >
      <View style={styles.left}>
        <BadgeWrapper
          badgePosition={BadgePosition.TopRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              name={networkName}
              imageSource={getNetworkImageSource({
                chainId: earnToken?.chainId ?? '',
              })}
            />
          }
        >
          <EarnNetworkAvatar token={earnToken} />
        </BadgeWrapper>
        <View>
          <Text variant={TextVariant.BodyMDMedium}>{earnToken.name}</Text>
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
          >{`${strings('earn.earning')} ${earnToken.apr}%`}</Text>
        </View>
      </View>
      <View style={styles.right}>
        {/* Only show token balance if exchange rates aren't available */}
        {earnToken?.balanceFiat !== 'tokenRateUndefined' ? (
          <>
            <Text variant={TextVariant.BodyMDMedium}>
              {earnToken.balanceFiat}
            </Text>
            <Text
              variant={TextVariant.BodySMMedium}
              color={TextColor.Alternative}
            >
              {earnToken.balanceFormatted}
            </Text>
          </>
        ) : (
          <Text variant={TextVariant.BodyMDMedium}>
            {earnToken.balanceFormatted}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default EarnWithdrawalTokenListItem;
