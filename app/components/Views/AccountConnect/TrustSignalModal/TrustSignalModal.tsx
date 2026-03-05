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
import { TrustSignalModalProps } from './TrustSignalModal.types';

const TrustSignalModal = ({
  url,
  onConnectAnyway,
  onClose,
}: TrustSignalModalProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});

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
              name={IconName.Danger}
              size={IconSize.Xl}
              color={IconColor.Error}
            />
          </View>

          {/* Title */}
          <TextComponent
            variant={TextVariant.HeadingMD}
            style={styles.title}
            testID={TrustSignalModalSelectorsIDs.TITLE}
          >
            {strings('accounts.trust_signal_block_title')}
          </TextComponent>

          {/* URL with icon */}
          <View
            style={styles.urlContainer}
            testID={TrustSignalModalSelectorsIDs.URL}
          >
            <TextComponent
              variant={TextVariant.BodyMD}
              color={TextColor.Error}
              style={styles.urlText}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {url}
            </TextComponent>
            <Icon
              name={IconName.Danger}
              size={IconSize.Sm}
              color={IconColor.Error}
            />
          </View>

          {/* Description box */}
          <View
            style={[
              styles.descriptionBox,
              { backgroundColor: colors.error.muted },
            ]}
            testID={TrustSignalModalSelectorsIDs.DESCRIPTION_BOX}
          >
            <TextComponent variant={TextVariant.BodyMD}>
              {strings('accounts.trust_signal_block_description')}
            </TextComponent>
          </View>
        </View>

        {/* Connect Anyway button */}
        <View style={styles.buttonContainer}>
          <StyledButton
            type="danger"
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
