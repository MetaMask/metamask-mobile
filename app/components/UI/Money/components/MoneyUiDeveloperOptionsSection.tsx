import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../../../../util/theme';
import {
  setMoneyOnboardingSeen,
  setOnboardingStepperStep,
} from '../../../../actions/user';
import { selectMoneyOnboardingSeen } from '../../../../reducers/user/selectors';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { useStyles } from '../../../../component-library/hooks';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import styleSheet from '../../../Views/Settings/DeveloperOptions/DeveloperOptions.styles';
import ClipboardManager from '../../../../core/ClipboardManager';
import { STEPPER_IDS } from '../hooks/useOnboardingStep';
import Routes from '../../../../constants/navigation/Routes';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../selectors/featureFlagController/moneyAccount';

export const MoneyUiDeveloperOptionsSection = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const navigation = useNavigation();

  const hasSeenMoneyOnboarding = useSelector(selectMoneyOnboardingSeen);
  const isOnboardingEnabled = useSelector(
    selectMoneyOnboardingStepperAnimationEnabled,
  );
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const moneyAccountAddress = primaryMoneyAccount?.address;

  const handleResetOnboardingSeenState = useCallback(() => {
    dispatch(setMoneyOnboardingSeen(false));
  }, [dispatch]);

  const handleResetOnboardingStepperStep = useCallback(() => {
    dispatch(setOnboardingStepperStep(STEPPER_IDS.MONEY, 0));
  }, [dispatch]);

  const handleCopyAddress = useCallback(async () => {
    if (moneyAccountAddress) {
      await ClipboardManager.setString(moneyAccountAddress);
    }
  }, [moneyAccountAddress]);

  const handlePreviewFirstTimeDepositAnimation = useCallback(() => {
    navigation.navigate(Routes.MONEY.FIRST_TIME_DEPOSIT);
  }, [navigation]);

  return (
    <Box twClassName="gap-2">
      <Box>
        <Text variant={TextVariant.HeadingLg} style={styles.heading}>
          {'Money UI'}
        </Text>
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {`Onboarding enabled: ${String(isOnboardingEnabled)}`}
        </Text>
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {`Onboarding seen: ${String(hasSeenMoneyOnboarding)}`}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          style={styles.accessory}
          size={ButtonSize.Lg}
          onPress={handleResetOnboardingSeenState}
          isFullWidth
        >
          {'Reset onboarding screen'}
        </Button>
      </Box>
      <Box>
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {`Money Account Address: ${moneyAccountAddress ?? 'N/A'}`}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          style={styles.accessory}
          size={ButtonSize.Lg}
          onPress={handleCopyAddress}
          isDisabled={!moneyAccountAddress}
          isFullWidth
        >
          {'Copy Money Account Address'}
        </Button>
      </Box>
      <Box>
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {'Reset Money home onboarding stepper'}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          style={styles.accessory}
          size={ButtonSize.Lg}
          onPress={handleResetOnboardingStepperStep}
          isFullWidth
        >
          {'Reset onboarding stepper'}
        </Button>
      </Box>
      <Box>
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {'Preview first-time deposit animation'}
        </Text>
        <Button
          variant={ButtonVariant.Secondary}
          style={styles.accessory}
          size={ButtonSize.Lg}
          onPress={handlePreviewFirstTimeDepositAnimation}
          isFullWidth
        >
          {'View animation'}
        </Button>
      </Box>
    </Box>
  );
};
