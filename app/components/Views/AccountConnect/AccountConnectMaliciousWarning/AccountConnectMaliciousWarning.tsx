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
import styleSheet from './AccountConnectMaliciousWarning.styles';
import { AccountConnectMaliciousWarningSelectorsIDs } from './AccountConnectMaliciousWarning.testIds';

interface AccountConnectMaliciousWarningProps {
  /** The dapp URL to display as a threat. */
  url: string;
  /** Callback when the user explicitly accepts the risk and wants to connect. */
  onConnectAnyway: () => void;
  /** Callback to close / dismiss the warning (back or X button). */
  onClose: () => void;
}

const AccountConnectMaliciousWarning = ({
  url,
  onConnectAnyway,
  onClose,
}: AccountConnectMaliciousWarningProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});

  return (
    <SafeAreaView
      style={styles.safeArea}
      testID={AccountConnectMaliciousWarningSelectorsIDs.CONTAINER}
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
              testID={AccountConnectMaliciousWarningSelectorsIDs.CLOSE_BUTTON}
            />
          </View>

          {/* Warning icon */}
          <View style={styles.warningIconContainer}>
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
            testID={AccountConnectMaliciousWarningSelectorsIDs.WARNING_TITLE}
          >
            {strings('accounts.malicious_site_detected')}
          </TextComponent>

          {/* URL with warning icon */}
          <View
            style={styles.urlContainer}
            testID={AccountConnectMaliciousWarningSelectorsIDs.WARNING_URL}
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

          {/* Warning message box */}
          <View
            style={[styles.warningBox, { backgroundColor: colors.error.muted }]}
            testID={AccountConnectMaliciousWarningSelectorsIDs.WARNING_BOX}
          >
            <TextComponent variant={TextVariant.BodyMD}>
              {strings('accounts.malicious_site_warning')}
            </TextComponent>
          </View>
        </View>

        {/* Connect Anyway button */}
        <View style={styles.buttonContainer}>
          <StyledButton
            type="danger"
            onPress={onConnectAnyway}
            containerStyle={styles.connectAnywayButton}
            testID={
              AccountConnectMaliciousWarningSelectorsIDs.CONNECT_ANYWAY_BUTTON
            }
          >
            {strings('accounts.connect_anyway')}
          </StyledButton>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AccountConnectMaliciousWarning;
