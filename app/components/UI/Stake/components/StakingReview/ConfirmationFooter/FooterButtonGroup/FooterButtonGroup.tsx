import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { View } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../hooks/useStyles';
import styleSheet from './FooterButtonGroup.styles';

const FooterButtonGroup = () => {
  const { styles } = useStyles(styleSheet, {});

  const navigation = useNavigation();

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.footerContainer}>
      <Button
        label={
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
            {strings('stake.cancel')}
          </Text>
        }
        style={styles.button}
        variant={ButtonVariants.Secondary}
        width={ButtonWidthTypes.Full}
        size={ButtonSize.Lg}
        onPress={handleGoBack}
      />
      <Button
        label={
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Inverse}>
            {strings('stake.confirm')}
          </Text>
        }
        style={styles.button}
        variant={ButtonVariants.Primary}
        width={ButtonWidthTypes.Full}
        size={ButtonSize.Lg}
        // TODO: Replace with actual stake confirmation flow
        onPress={handleGoBack}
      />
    </View>
  );
};

export default FooterButtonGroup;
