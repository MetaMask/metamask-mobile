import React from 'react';
import { SafeAreaView, View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import TextComponent, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../component-library/components/Icons/Icon';
import StyledButton from '../../../UI/StyledButton';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import styleSheet from './TrustSignalModal.styles';
import { TrustSignalModalSelectorsIDs } from './TrustSignalModal.testIds';
import {
  TrustSignalModalProps,
  TrustSignalModalVariant,
} from './TrustSignalModal.types';

const VARIANT_CONFIG: Record<
  TrustSignalModalVariant,
  {
    iconName: IconName;
    iconColor: IconColor;
    textColor: TextColor;
    mutedColorKey: 'warning' | 'error';
    titleKey: string;
    descriptionKey: string;
    buttonType: string;
  }
> = {
  warning: {
    iconName: IconName.Danger,
    iconColor: IconColor.Warning,
    textColor: TextColor.Warning,
    mutedColorKey: 'warning',
    titleKey: 'accounts.trust_signal_warning_title',
    descriptionKey: 'accounts.trust_signal_warning_description',
    buttonType: 'warning',
  },
  malicious: {
    iconName: IconName.Danger,
    iconColor: IconColor.Error,
    textColor: TextColor.Error,
    mutedColorKey: 'error',
    titleKey: 'accounts.trust_signal_block_title',
    descriptionKey: 'accounts.trust_signal_block_description',
    buttonType: 'danger',
  },
};

const TrustSignalModal = ({
  variant,
  url,
  onConnectAnyway,
  onClose,
}: TrustSignalModalProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});
  const config = VARIANT_CONFIG[variant];

  return (
    <SafeAreaView
      style={styles.safeArea}
      testID={TrustSignalModalSelectorsIDs.CONTAINER}
    >
      <View style={styles.mainContainer}>
        <View style={styles.contentContainer}>
          {/* Header with close button */}
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <ButtonIcon
              size={ButtonIconSizes.Sm}
              iconName={IconName.Close}
              iconColor={IconColor.Default}
              onPress={onClose}
              testID={TrustSignalModalSelectorsIDs.CLOSE_BUTTON}
            />
          </View>

          {/* Warning/danger icon */}
          <View style={styles.iconContainer}>
            <Icon
              name={config.iconName}
              size={IconSize.Xl}
              color={config.iconColor}
            />
          </View>

          {/* Title */}
          <TextComponent
            variant={TextVariant.HeadingMD}
            style={styles.title}
            testID={TrustSignalModalSelectorsIDs.TITLE}
          >
            {strings(config.titleKey)}
          </TextComponent>

          {/* URL with icon */}
          <View
            style={styles.urlContainer}
            testID={TrustSignalModalSelectorsIDs.URL}
          >
            <TextComponent
              variant={TextVariant.BodyMD}
              color={config.textColor}
              style={styles.urlText}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {url}
            </TextComponent>
            <Icon
              name={config.iconName}
              size={IconSize.Sm}
              color={config.iconColor}
            />
          </View>

          {/* Description box */}
          <View
            style={[
              styles.descriptionBox,
              { backgroundColor: colors[config.mutedColorKey].muted },
            ]}
            testID={TrustSignalModalSelectorsIDs.DESCRIPTION_BOX}
          >
            <TextComponent variant={TextVariant.BodyMD}>
              {strings(config.descriptionKey)}
            </TextComponent>
          </View>
        </View>

        {/* Connect Anyway button */}
        <View style={styles.buttonContainer}>
          <StyledButton
            type={config.buttonType}
            onPress={onConnectAnyway}
            containerStyle={styles.connectAnywayButton}
            testID={TrustSignalModalSelectorsIDs.CONNECT_ANYWAY_BUTTON}
          >
            {strings('accounts.connect_anyway')}
          </StyledButton>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default TrustSignalModal;
