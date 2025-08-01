import React from 'react';
import { Hex } from '@metamask/utils';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import TokenIcon from '../../../../UI/Swaps/components/TokenIcon';
import { Box } from '../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../UI/Box/box.types';
import Text from '../../../../../component-library/components/Texts/Text';
import styleSheet from './token-pill.styles';
import { useStyles } from '../../../../hooks/useStyles';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { getNetworkImageSource } from '../../../../../util/networks';

export interface TokenPillProps {
  address: Hex;
  chainId: Hex;
}

export const TokenPill: React.FC<TokenPillProps> = ({ address, chainId }) => {
  const { styles } = useStyles(styleSheet, {});
  const tokens = useTokensWithBalance({ chainIds: [chainId] });

  const token = tokens.find(
    (t) =>
      t.address.toLowerCase() === address.toLowerCase() &&
      t.chainId === chainId,
  );

  if (!token) {
    return null;
  }

  const networkImageSource = getNetworkImageSource({
    chainId,
  });

  return (
    <Box
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      style={styles.base}
    >
      <BadgeWrapper
        style={styles.networkIcon}
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            imageSource={networkImageSource}
          />
        }
      >
        <TokenIcon
          testID="token-pill-icon"
          icon={token?.image}
          symbol={token?.symbol}
          style={styles.tokenIcon}
        />
      </BadgeWrapper>
      <Text testID="token-pill-symbol">{token?.symbol}</Text>
    </Box>
  );
};
