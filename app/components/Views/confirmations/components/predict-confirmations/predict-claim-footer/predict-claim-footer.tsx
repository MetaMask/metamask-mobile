import React from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { noop } from 'lodash';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './predict-claim-footer.styles';
import AvatarGroup from '../../../../../../component-library/components/Avatars/AvatarGroup';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { MultichainNetwork } from '@metamask/multichain-transactions-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';

export function PredictClaimFooter() {
  const { styles } = useStyles(styleSheet, {});

  const networkAvatars = [
    MultichainNetwork.Bitcoin,
    MultichainNetwork.Solana,
    CHAIN_IDS.POLYGON,
    CHAIN_IDS.MAINNET,
    CHAIN_IDS.ARBITRUM,
  ].map((chainId) => ({
    imageSource: getNetworkImageSource({ chainId }),
    variant: AvatarVariant.Token as const,
  }));

  return (
    <Box style={styles.container}>
      <Box style={styles.top}>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          Winnings from 5 markets
        </Text>
        <AvatarGroup
          avatarPropsList={networkAvatars}
          size={AvatarSize.Sm}
          maxStackedAvatars={3}
        />
      </Box>
      <Button
        variant={ButtonVariants.Primary}
        labelTextVariant={TextVariant.BodyLGMedium}
        style={styles.button}
        label="Claim winnings"
        onPress={noop}
        isInverse
      />
      <Text
        variant={TextVariant.BodyXS}
        color={TextColor.Alternative}
        style={styles.bottom}
      >
        Funds will be added to your available balance
      </Text>
    </Box>
  );
}
