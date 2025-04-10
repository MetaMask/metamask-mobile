import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { selectEvmNetworkName } from '../../../../../../selectors/networkInfos';
import { useStyles } from '../../../../../hooks/useStyles';
import NetworkMainAssetLogo from '../../../../NetworkMainAssetLogo';
import styleSheet from './TokenValueStack.styles';
import images from '../../../../../../images/image-icons';
import { TokenValueStackProps } from './TokenValueStack.types';
import { renderFromWei } from '../../../../../../util/number';

const TokenValueStack = ({
  amountWei,
  amountFiat,
  tokenSymbol,
  style,
}: TokenValueStackProps) => {
  const { styles } = useStyles(styleSheet, {});

  const networkName = useSelector(selectEvmNetworkName);

  return (
    <View style={[styles.tokenValueStackContainer, style]}>
      <BadgeWrapper
        style={styles.badgeWrapper}
        badgePosition={BadgePosition.BottomRight}
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
        <Text variant={TextVariant.HeadingLG}>
          {renderFromWei(amountWei)} {tokenSymbol}
        </Text>
        <Text color={TextColor.Alternative}>{amountFiat}</Text>
      </View>
    </View>
  );
};

export default TokenValueStack;
