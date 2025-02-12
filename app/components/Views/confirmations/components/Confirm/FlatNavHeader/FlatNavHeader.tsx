import React, { useCallback } from 'react';
import { View } from 'react-native';

import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../../component-library/hooks';
import {
  default as MorphText,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import styleSheet from './FlatNavHeader.styles';

interface FlatNavHeaderProps {
  title: string;
  onLeftPress?: () => void;
}

const FlatNavHeader = ({ title, onLeftPress }: FlatNavHeaderProps) => {
  const { onReject } = useConfirmActions();
  const { styles } = useStyles(styleSheet, {});

  const handleLeftPress = useCallback(() => {
    if (onLeftPress) {
      onLeftPress();
      return;
    }

    onReject();
  }, [onLeftPress, onReject]);

  return (
    <View style={styles.container}>
      <ButtonIcon
        iconName={IconName.ArrowLeft}
        onPress={handleLeftPress}
        size={ButtonIconSizes.Lg}
        style={styles.left}
        testID="flat-nav-header-back-button"
      />
      <MorphText variant={TextVariant.HeadingMD}>{title}</MorphText>
    </View>
  );
};

export default FlatNavHeader;
