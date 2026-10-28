import React from 'react';
import { Modal } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { OwnedTokensTestIds } from './OwnedTokens.testIds';

interface OwnedTokensWarningSheetProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const OwnedTokensWarningSheet = ({
  visible,
  onConfirm,
  onCancel,
}: OwnedTokensWarningSheetProps) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onCancel}
  >
    <Box
      twClassName="flex-1 justify-end bg-background-default/40"
      testID={OwnedTokensTestIds.WARNING_SHEET}
    >
      <Box twClassName="rounded-t-2xl bg-background-default px-4 pb-8 pt-5">
        <Text variant={TextVariant.HeadingSm} twClassName="mb-2">
          {strings('add_asset.owned_tokens.warning_title')}
        </Text>
        <Text variant={TextVariant.BodyMd} twClassName="mb-4">
          {strings('add_asset.owned_tokens.warning_body')}
        </Text>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onConfirm}
          testID={OwnedTokensTestIds.WARNING_CONFIRM}
        >
          {strings('add_asset.owned_tokens.warning_confirm')}
        </Button>
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onCancel}
          testID={OwnedTokensTestIds.WARNING_CANCEL}
        >
          {strings('add_asset.owned_tokens.warning_cancel')}
        </Button>
      </Box>
    </Box>
  </Modal>
);

export default OwnedTokensWarningSheet;
