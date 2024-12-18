import React, { useRef } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { View } from 'react-native';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  ButtonProps,
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button/Button.types';
import styleSheet from './GasImpactModal.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { GasImpactModalProps } from './GasImpactModal.types';
import { strings } from '../../../../../../locales/i18n';

const GasImpactModal = ({ route }: GasImpactModalProps) => {
  const { styles } = useStyles(styleSheet, {});

  const { navigate } = useNavigation();

  const sheetRef = useRef<BottomSheetRef>(null);

  const handleClose = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const handleNavigateToStakeReviewScreen = () => {
    const {
      amountWei,
      annualRewardRate,
      annualRewardsFiat,
      annualRewardsETH,
      amountFiat,
    } = route.params;

    navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE_CONFIRMATION,
      params: {
        amountWei: amountWei.toString(),
        amountFiat,
        annualRewardsETH,
        annualRewardsFiat,
        annualRewardRate,
      },
    });
  };

  const footerButtons: ButtonProps[] = [
    {
      variant: ButtonVariants.Secondary,
      label: (
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
          {strings('stake.cancel')}
        </Text>
      ),
      size: ButtonSize.Lg,
      onPress: handleClose,
    },
    {
      variant: ButtonVariants.Primary,
      label: (
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Inverse}>
          {strings('stake.proceed_anyway')}
        </Text>
      ),
      labelTextVariant: TextVariant.BodyMDMedium,
      size: ButtonSize.Lg,
      onPress: handleNavigateToStakeReviewScreen,
    },
  ];

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.container}>
        <BottomSheetHeader onClose={handleClose}>
          <Text variant={TextVariant.HeadingMD}>
            {strings('stake.gas_cost_impact')}
          </Text>
        </BottomSheetHeader>
        <Text style={styles.content}>
          {strings('stake.gas_cost_impact_warning')}
        </Text>
        <BottomSheetFooter
          buttonsAlignment={ButtonsAlignment.Horizontal}
          buttonPropsArray={footerButtons}
          style={styles.footer}
        />
      </View>
    </BottomSheet>
  );
};

export default GasImpactModal;
