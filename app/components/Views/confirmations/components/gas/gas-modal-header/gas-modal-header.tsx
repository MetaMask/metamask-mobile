import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './gas-modal-header.styles';

import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';

export const GasModalHeader = ({
  onBackButtonClick,
  title,
}: {
  onBackButtonClick: () => void;
  title: string;
}) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container}>
      <View style={styles.backButton}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          onPress={onBackButtonClick}
          size={ButtonIconSizes.Sm}
          testID="back-button"
        />
      </View>
      <Text variant={TextVariant.HeadingMD} style={styles.title}>
        {title}
      </Text>
    </View>
  );
};
