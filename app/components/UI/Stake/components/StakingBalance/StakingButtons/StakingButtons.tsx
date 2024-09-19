import React, { useState } from 'react';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../../locales/i18n';
import { View } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './StakingButtons.styles';
import useTooltipModal from '../../../../../hooks/useTooltipModal';
import { useNavigation } from '@react-navigation/native';

const StakingButtons = () => {
  const [hasStakedPosition] = useState(true);
  const [hasEthToUnstake] = useState(true);

  const { openTooltipModal } = useTooltipModal();

  const { navigate } = useNavigation();

  const { styles } = useStyles(styleSheet, {});

  // TODO: Connect to unstaking flow it's when ready
  const onUnstakePress = () =>
    openTooltipModal('TODO', 'Connect to unstaking flow');

  const onStakePress = () => navigate('Stake');

  return (
    <View style={styles.balanceButtonsContainer}>
      {hasEthToUnstake && (
        <Button
          style={styles.balanceActionButton}
          variant={ButtonVariants.Secondary}
          label={strings('stake.unstake')}
          onPress={onUnstakePress}
        />
      )}
      {hasStakedPosition ? (
        <Button
          style={styles.balanceActionButton}
          variant={ButtonVariants.Secondary}
          label={strings('stake.stake_more')}
          onPress={onStakePress}
        />
      ) : (
        <Button
          style={styles.balanceActionButton}
          variant={ButtonVariants.Secondary}
          label={strings('stake.stake')}
          onPress={onStakePress}
        />
      )}
    </View>
  );
};

export default StakingButtons;
