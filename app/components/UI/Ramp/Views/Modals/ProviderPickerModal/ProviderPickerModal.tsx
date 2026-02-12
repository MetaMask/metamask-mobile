import React, { useCallback, useMemo, useRef } from 'react';
import { ScrollView } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import ListItemSelect from '../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import type { Provider } from '@metamask/ramps-controller';
import { strings } from '../../../../../../../locales/i18n';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import styleSheet from './ProviderPickerModal.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import { useRampsController } from '../../../hooks/useRampsController';

export interface ProviderPickerModalParams {
  assetId: string;
}

export const createProviderPickerModalNavigationDetails =
  createNavigationDetails<ProviderPickerModalParams>(
    Routes.RAMP.MODALS.ID,
    Routes.RAMP.MODALS.PROVIDER_PICKER,
  );

function ProviderPickerModal() {
  const { assetId } = useParams<ProviderPickerModalParams>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});

  const { providers, selectedProvider, setSelectedProvider } =
    useRampsController();

  const compatibleProviders = useMemo(
    () =>
      providers.filter(
        (p: Provider) => p.supportedCryptoCurrencies?.[assetId] === true,
      ),
    [providers, assetId],
  );

  const handleProviderPress = useCallback(
    (provider: Provider) => {
      setSelectedProvider(provider);
      sheetRef.current?.onCloseBottomSheet();
    },
    [setSelectedProvider],
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      testID="provider-picker-modal"
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: 'bottomsheetheader-close-button' }}
      >
        <Text variant={TextVariant.HeadingMD}>
          {strings('fiat_on_ramp.provider_picker_modal.title')}
        </Text>
      </BottomSheetHeader>

      <ScrollView style={styles.content}>
        {compatibleProviders.map((provider: Provider) => (
          <ListItemSelect
            key={provider.id}
            isSelected={selectedProvider?.id === provider.id}
            onPress={() => handleProviderPress(provider)}
            accessibilityRole="button"
            accessible
          >
            <ListItemColumn widthType={WidthType.Fill}>
              <Text variant={TextVariant.BodyLGMedium}>{provider.name}</Text>
            </ListItemColumn>
          </ListItemSelect>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

export default ProviderPickerModal;
