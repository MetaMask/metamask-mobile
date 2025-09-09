// Third party dependencies
import React, { useRef } from 'react';

// External dependencies
import { View } from 'react-native';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './ConnectionDetails.styles';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../../util/navigation/types';

type ConnectionDetailsProps = StackScreenProps<
  RootParamList,
  'ConnectionDetails'
>;

const ConnectionDetails = ({ route }: ConnectionDetailsProps) => {
  const { connectionDateTime = 123456789 } = route.params;

  const { styles } = useStyles(styleSheet, {});

  const sheetRef = useRef<BottomSheetRef>(null);

  const onDismiss = () => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const formatConnectionDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.container}>
        <BottomSheetHeader>
          <Text variant={TextVariant.HeadingMD}>
            {strings('permissions.connection_details_title')}
          </Text>
        </BottomSheetHeader>
        <View style={styles.descriptionContainer}>
          <Text variant={TextVariant.BodyMD}>
            {strings('permissions.connection_details_description', {
              connectionDateTime: formatConnectionDate(connectionDateTime),
            })}
          </Text>
        </View>
        <View style={styles.buttonsContainer}>
          <Button
            label={strings('permissions.got_it')}
            style={styles.button}
            size={ButtonSize.Lg}
            variant={ButtonVariants.Primary}
            onPress={onDismiss}
          />
        </View>
      </View>
    </BottomSheet>
  );
};

export default ConnectionDetails;
