import React from 'react';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../../locales/i18n';
import { View, ViewProps } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './StakingButtons.styles';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';

interface StakingButtonsProps extends Pick<ViewProps, 'style'> {
  hasStakedPositions: boolean;
  hasEthToUnstake: boolean;
}

const StakingButtons = ({
  style,
  hasStakedPositions,
  hasEthToUnstake,
}: StakingButtonsProps) => {
  const { navigate } = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  const onUnstakePress = () =>
    navigate('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE,
    });

  const onStakePress = () =>
    navigate('StakeScreens', { screen: Routes.STAKING.STAKE });

  return (
    <View style={[styles.balanceButtonsContainer, style]}>
      {hasEthToUnstake && (
        <Button
          style={styles.balanceActionButton}
          variant={ButtonVariants.Secondary}
          label={strings('stake.unstake')}
          onPress={onUnstakePress}
        />
      )}
      <Button
        style={styles.balanceActionButton}
        variant={ButtonVariants.Secondary}
        label={
          hasStakedPositions
            ? strings('stake.stake_more')
            : strings('stake.stake')
        }
        onPress={onStakePress}
      />
    </View>
  );
};

export default StakingButtons;
