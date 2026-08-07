import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './gas-modal-header.styles';

import ButtonIcon from '../../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import { Text, TextVariant } from '@metamask/design-system-react-native';

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
          testID="back-button"
        />
      </View>
      <Text variant={TextVariant.HeadingMd} style={styles.title}>
        {title}
      </Text>
    </View>
  );
};
