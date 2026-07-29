import React from 'react';
import { View } from 'react-native';
import { styleSheet } from './styles';
import Engine from '../../../../../../core/Engine';
import { useStyles } from '../../../../../../component-library/hooks';
import { strings } from '../../../../../../../locales/i18n';
import { CLEAR_PRIVACY_SECTION } from '../../SecuritySettings.constants';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import SDKConnect from '../../../../../../../app/core/SDKConnect/SDKConnect';
import { SecurityPrivacyViewSelectorsIDs } from '../../SecurityPrivacyView.testIds';
import { ClearPrivacyModalSelectorsIDs } from './ClearPrivacyModal.testIds';
import { isSnapId } from '@metamask/snaps-utils';

interface ClearPrivacyProps {
  openConfirmSheet: (config: {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    testID?: string;
  }) => void;
}

const ClearPrivacy = ({ openConfirmSheet }: ClearPrivacyProps) => {
  const { styles } = useStyles(styleSheet, {});

  const clearApprovals = () => {
    const { PermissionController } = Engine.context;
    PermissionController.getSubjectNames()
      .filter((subject) => !isSnapId(subject))
      .forEach((subject) => PermissionController.revokeAllPermissions(subject));
    SDKConnect.getInstance().removeAll();
  };

  const openSheet = () =>
    openConfirmSheet({
      title: strings('app_settings.clear_approvals_modal_title'),
      message: strings('app_settings.clear_approvals_modal_message'),
      confirmText: strings('app_settings.clear'),
      cancelText: strings('app_settings.reset_account_cancel_button'),
      onConfirm: clearApprovals,
      testID: ClearPrivacyModalSelectorsIDs.CONTAINER,
    });

  return (
    <View style={[styles.setting]} testID={CLEAR_PRIVACY_SECTION}>
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {strings('app_settings.clear_privacy_title')}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        style={styles.desc}
      >
        {strings('app_settings.clear_privacy_desc')}
      </Text>
      <View style={styles.accessory}>
        <Button
          variant={ButtonVariant.Secondary}
          testID={SecurityPrivacyViewSelectorsIDs.CLEAR_PRIVACY_DATA_BUTTON}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={openSheet}
        >
          {strings('app_settings.clear_privacy_title')}
        </Button>
      </View>
    </View>
  );
};

export default ClearPrivacy;
