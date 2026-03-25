import React, { useRef } from 'react';
import { View } from 'react-native';
import styleSheet from './IncompatibleAccountTokenModal.styles';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';

import { useStyles } from '../../../../../hooks/useStyles';
import { createNavigationDetails } from '../../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';

export const createIncompatibleAccountTokenModalNavigationDetails =
  createNavigationDetails(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.INCOMPATIBLE_ACCOUNT_TOKEN,
  );

function IncompatibleAccountTokenModal() {
  const sheetRef = useRef<BottomSheetRef>(null);

  const { styles } = useStyles(styleSheet, {});

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
          {strings(
            'fiat_on_ramp_aggregator.incompatible_token_account_modal.title',
          )}
        </Text>
      </BottomSheetHeader>

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
          {strings(
            'fiat_on_ramp_aggregator.incompatible_token_account_modal.description',
            {
              networkName: 'this network',
            },
          )}
        </Text>
        <Button
          size={ButtonSize.Lg}
          onPress={() => sheetRef.current?.onCloseBottomSheet()}
          variant={ButtonVariant.Primary}
          isFullWidth
        >
          {strings(
            'fiat_on_ramp_aggregator.incompatible_token_account_modal.cta',
          )}
        </Button>
      </View>
    </BottomSheet>
  );
}

export default IncompatibleAccountTokenModal;
