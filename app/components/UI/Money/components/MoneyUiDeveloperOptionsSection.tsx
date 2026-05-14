import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useTheme } from '../../../../util/theme';
import { setMoneyOnboardingSeen } from '../../../../actions/user';
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

export const MoneyUiDeveloperOptionsSection = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const hasSeenMoneyOnboarding = useSelector(selectMoneyOnboardingSeen);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const moneyAccountAddress = primaryMoneyAccount?.address;

  const handleResetOnboardingSeenState = useCallback(() => {
    dispatch(setMoneyOnboardingSeen(false));
  }, [dispatch]);

  const handleCopyAddress = useCallback(async () => {
    if (moneyAccountAddress) {
      await ClipboardManager.setString(moneyAccountAddress);
    }
  }, [moneyAccountAddress]);

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
    </Box>
  );
};
