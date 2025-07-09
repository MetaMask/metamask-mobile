import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon/Icon.types';
import Icon from '../../../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button/Button.types';
import Button from '../../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './ErrorView.styles';

interface Props {
  description?: string;
  title?: string;
  ctaLabel?: string;
  ctaOnPress?: () => void;
}

function ErrorView({ description, title, ctaLabel, ctaOnPress }: Props) {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.content}>
      <View style={styles.mainSection}>
        <View style={styles.iconRow}>
          <View style={styles.errorIconContainer}>
            <Icon
              name={IconName.Close}
              size={IconSize.Xl}
              color={IconColor.Error}
            />
          </View>
        </View>

        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Error}
          style={styles.title}
        >
          {title || strings('deposit.error_view.title')}
        </Text>

        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.description}
        >
          {description || strings('deposit.error_view.description')}
        </Text>

        {ctaOnPress && (
          <Button
            style={styles.button}
            variant={ButtonVariants.Primary}
            onPress={ctaOnPress}
            label={ctaLabel || strings('deposit.error_view.try_again')}
            size={ButtonSize.Lg}
          />
        )}
      </View>
    </View>
  );
}

export default ErrorView;
