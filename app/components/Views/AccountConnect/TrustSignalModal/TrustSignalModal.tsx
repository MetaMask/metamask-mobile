import React from 'react';
import { SafeAreaView, View } from 'react-native';
import {
  Text,
  TextColor,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
  ButtonIcon,
  ButtonIconSize,
  ButtonSemantic,
  ButtonSemanticSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
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
              size={ButtonIconSize.Sm}
              iconName={IconName.Close}
              iconProps={{ color: IconColor.IconDefault }}
              onPress={onClose}
              testID={TrustSignalModalSelectorsIDs.CLOSE_BUTTON}
            />
          </View>

          {/* Warning/danger icon */}
          <View style={styles.iconContainer}>
            <Icon
              name={IconName.Danger}
              size={IconSize.Xl}
              color={IconColor.ErrorDefault}
            />
          </View>

          {/* Title */}
          <Text
            variant={TextVariant.HeadingMD}
            style={styles.title}
            testID={TrustSignalModalSelectorsIDs.TITLE}
          >
            {strings('accounts.trust_signal_block_title')}
          </Text>

          {/* URL with icon */}
          <View
            style={styles.urlContainer}
            testID={TrustSignalModalSelectorsIDs.URL}
          >
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.ErrorDefault}
              style={styles.urlText}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {url}
            </Text>
            <Icon
              name={IconName.Danger}
              size={IconSize.Sm}
              color={IconColor.ErrorDefault}
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
            <Text variant={TextVariant.BodyMD}>
              {strings('accounts.trust_signal_block_description')}
            </Text>
          </View>
        </View>

        {/* Connect Anyway button */}
        <View style={styles.buttonContainer}>
          <ButtonSemantic
            severity={ButtonSemanticSeverity.Danger}
            onPress={onConnectAnyway}
            style={styles.connectAnywayButton}
            testID={TrustSignalModalSelectorsIDs.CONNECT_ANYWAY_BUTTON}
          >
            {strings('accounts.connect_anyway')}
          </ButtonSemantic>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default TrustSignalModal;
