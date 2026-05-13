import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useTheme } from '../../../../util/theme';
import { setMoneyOnboardingSeen } from '../../../../actions/user';
import { selectMoneyOnboardingSeen } from '../../../../reducers/user/selectors';
import { useStyles } from '../../../../component-library/hooks';
import {
  Text,
  TextColor,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import styleSheet from '../../../Views/Settings/DeveloperOptions/DeveloperOptions.styles';

export const MoneyUiDeveloperOptionsSection = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const hasSeenMoneyOnboarding = useSelector(selectMoneyOnboardingSeen);

  const handleResetOnboardingSeenState = useCallback(() => {
    dispatch(setMoneyOnboardingSeen(false));
  }, [dispatch]);

  return (
    <>
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
    </>
  );
};
