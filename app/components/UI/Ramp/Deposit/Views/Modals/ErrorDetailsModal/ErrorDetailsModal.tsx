import React, { useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../../../component-library/hooks';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';
import styleSheet from './ErrorDetailsModal.styles';

export interface ErrorDetailsModalParams {
  errorMessage: string;
}

export const createErrorDetailsModalNavigationDetails =
  createNavigationDetails<ErrorDetailsModalParams>(
    Routes.DEPOSIT.MODALS.ID,
    Routes.DEPOSIT.MODALS.ERROR_DETAILS,
  );

function ErrorDetailsModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { height: screenHeight } = useWindowDimensions();
  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });

  const { errorMessage } = useParams<ErrorDetailsModalParams>();

  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack>
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        <View style={styles.headerContainer}>
          <Icon
            name={IconName.Danger}
            size={IconSize.Md}
            color={IconColor.Error}
          />
          <Text variant={TextVariant.HeadingMD}>
            {strings('deposit.errors.error_details_title')}
          </Text>
        </View>
      </BottomSheetHeader>

      <ScrollView style={styles.scrollView}>
        <View style={styles.contentContainer}>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Default}
            style={styles.errorText}
          >
            {errorMessage}
          </Text>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

export default ErrorDetailsModal;
