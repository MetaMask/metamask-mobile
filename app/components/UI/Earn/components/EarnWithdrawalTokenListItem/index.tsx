import React from 'react';
import styleSheet from './EarnWithdrawalTokenListItem.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { EarnNetworkAvatar } from '../EarnNetworkAvatar';
import { TouchableOpacity, View } from 'react-native';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getNetworkImageSource } from '../../../../../util/networks';
import { strings } from '../../../../../../locales/i18n';
import { EarnTokenDetails } from '../../types/lending.types';

export interface EarnWithdrawalTokenListItemProps {
  earnToken: EarnTokenDetails;
  onPress: (earnToken: EarnTokenDetails) => void;
}

const EarnWithdrawalTokenListItem = ({
  earnToken,
  onPress,
}: EarnWithdrawalTokenListItemProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    earnToken && (
      <TouchableOpacity
        style={styles.container}
        onPress={() => onPress(earnToken)}
      >
        <View style={styles.left}>
          <BadgeWrapper
            position={BadgeWrapperPosition.BottomRight}
            badge={
              <BadgeNetwork
                twClassName="h-4 w-4 rounded bg-default"
                src={
                  getNetworkImageSource({
                    chainId: earnToken?.chainId ?? '',
                  }) as React.ComponentProps<typeof BadgeNetwork>['src']
                }
              />
            }
          >
            <EarnNetworkAvatar token={earnToken} />
          </BadgeWrapper>
          <View style={styles.textContainer}>
            <Text
              numberOfLines={1}
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              ellipsizeMode="tail"
            >
              {earnToken.name}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >{`${strings('earn.earning')} ${parseFloat(
              earnToken?.experience?.apr ?? '0',
            ).toFixed(1)}%`}</Text>
          </View>
        </View>
        <View style={styles.right}>
          {/* Only show token balance if exchange rates aren't available */}
          {earnToken?.balanceFiat !== 'tokenRateUndefined' ? (
            <>
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {earnToken.balanceFiat}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {earnToken.balanceFormatted}
              </Text>
            </>
          ) : (
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {earnToken.balanceFormatted}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  );
};

export default EarnWithdrawalTokenListItem;
