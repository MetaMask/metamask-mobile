import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useTheme } from '../../../../util/theme';
import { setMusdConversionEducationSeen } from '../../../../actions/user';
import { selectMusdConversionEducationSeen } from '../../../../reducers/user';
import { useStyles } from '../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import styleSheet from '../../../Views/Settings/DeveloperOptions/DeveloperOptions.styles';

export const MusdDeveloperOptionsSection = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const hasSeenConversionEducationScreen = useSelector(
    selectMusdConversionEducationSeen,
  );

  const handleResetEducationSeenState = useCallback(() => {
    dispatch(setMusdConversionEducationSeen(false));
  }, [dispatch]);

  return (
    <>
      <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={styles.heading}
      >
        {'mUSD'}
      </Text>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={styles.desc}
      >
        {`Education screen seen: ${String(hasSeenConversionEducationScreen)}`}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleResetEducationSeenState}
        isFullWidth
        style={styles.accessory}
      >
        {'Reset education screen'}
      </Button>
    </>
  );
};
