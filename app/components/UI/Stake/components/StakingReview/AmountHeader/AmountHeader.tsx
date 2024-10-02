import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { selectNetworkName } from '../../../../../../selectors/networkInfos';
import { useStyles } from '../../../../../hooks/useStyles';
import NetworkMainAssetLogo from '../../../../NetworkMainAssetLogo';
import styleSheet from './AmountHeader.styles';
import images from '../../../../../../images/image-icons';
import { AmountHeaderProps } from './AmountHeader.types';

const AmountHeader = ({
  balanceEth,
  balanceFiat,
  style,
}: AmountHeaderProps) => {
  const { styles } = useStyles(styleSheet, {});

  const networkName = useSelector(selectNetworkName);

  return (
    <View style={[styles.amountHeaderContainer, style]}>
      <BadgeWrapper
        style={styles.badgeWrapper}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            imageSource={images.ETHEREUM}
            name={networkName}
          />
        }
      >
        <NetworkMainAssetLogo style={styles.ethLogo} />
      </BadgeWrapper>
      <View style={styles.balancesContainer}>
        <Text variant={TextVariant.HeadingLG}>{balanceEth}</Text>
        <Text color={TextColor.Alternative}>{balanceFiat}</Text>
      </View>
    </View>
  );
};

export default AmountHeader;
