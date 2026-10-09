import React from 'react';
import { View } from 'react-native';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
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

  return (
    <View style={[styles.tokenValueStackContainer, style]}>
      <BadgeWrapper
        style={styles.badgeWrapper}
        position={BadgeWrapperPosition.BottomRight}
        badge={
          <BadgeNetwork
            twClassName="h-6 w-6 rounded-md bg-default"
            src={
              images.ETHEREUM as React.ComponentProps<
                typeof BadgeNetwork
              >['src']
            }
          />
        }
      >
        <NetworkMainAssetLogo style={styles.ethLogo} />
      </BadgeWrapper>
      <View style={styles.balancesContainer}>
        <Text variant={TextVariant.HeadingLg}>
          {renderFromWei(amountWei)} {tokenSymbol}
        </Text>
        <Text color={TextColor.TextAlternative}>{amountFiat}</Text>
      </View>
    </View>
  );
};

export default TokenValueStack;
