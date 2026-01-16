import React, { useCallback, useState } from 'react';
import { useStyles } from '../../../../../component-library/hooks';
import { createStyles } from './styles';
import { Box } from '../../../Box/Box';
import { View } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import Icon, {
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import {
  DEFAULT_BUTTONICON_ICONCOLOR,
  ICONSIZE_BY_BUTTONICONSIZE,
} from '../../../../../component-library/components/Buttons/ButtonIcon/ButtonIcon.constants';
import { ButtonIconSizes } from '../../../../../component-library/components/Buttons/ButtonIcon';

interface Props {
  onPress: () => void;
  disabled: boolean;
}

export const FLipQuoteButton = ({ onPress, disabled }: Props) => {
  const [pressed, setPressed] = useState(false);
  const { styles } = useStyles(createStyles, {
    disabled,
    pressed,
  });

  const triggerOnPressedIn = useCallback(() => {
    setPressed(true);
  }, [setPressed]);

  const triggerOnPressedOut = useCallback(() => {
    setPressed(false);
  }, [setPressed]);

  return (
    <Box style={styles.arrowContainer}>
      <View style={styles.separator} />
      <Box style={styles.arrowCircle}>
        <TouchableOpacity
          style={styles.button}
          onPress={!disabled ? onPress : undefined}
          onPressIn={!disabled ? triggerOnPressedIn : undefined}
          onPressOut={!disabled ? triggerOnPressedOut : undefined}
          disabled={disabled}
          accessible
          activeOpacity={1}
          testID="arrow-button"
        >
          <Icon
            name={IconName.SwapVertical}
            size={ICONSIZE_BY_BUTTONICONSIZE[ButtonIconSizes.Lg]}
            color={DEFAULT_BUTTONICON_ICONCOLOR}
          />
        </TouchableOpacity>
      </Box>
    </Box>
  );
};
