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
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';

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
      <HeaderCompactStandard
        title={strings(
          'fiat_on_ramp_aggregator.incompatible_token_account_modal.title',
        )}
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
        closeButtonProps={{
          testID: 'incompatible-account-token-modal-close-button',
        }}
      />

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
          label={strings(
            'fiat_on_ramp_aggregator.incompatible_token_account_modal.cta',
          )}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </BottomSheet>
  );
}

export default IncompatibleAccountTokenModal;
