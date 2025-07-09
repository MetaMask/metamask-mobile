import React, { useCallback } from 'react';
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
  description: string; // The error description (Required)
  title?: string; //  The error title, default will be "Error" if not provided (Optional)
  ctaLabel?: string; // The CTA button label, default will be "Try again" (Optional)
  ctaOnPress?: () => void; // The optional callback to be invoked when pressing the CTA button (Optional)
}

function ErrorView({ description, title, ctaLabel, ctaOnPress }: Props) {
  const { styles } = useStyles(styleSheet, {});

  const ctaOnPressCallback = useCallback(() => {
    ctaOnPress?.();
  }, [ctaOnPress]);

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
            onPress={ctaOnPressCallback}
            label={ctaLabel || strings('deposit.error_view.try_again')}
            size={ButtonSize.Lg}
          />
        )}
      </View>
    </View>
  );
}

export default ErrorView;
