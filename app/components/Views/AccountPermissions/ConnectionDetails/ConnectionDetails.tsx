// Third party dependencies
import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';

// External dependencies
import { View } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './ConnectionDetails.styles';
import {
  BottomSheet,
  type BottomSheetRef,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import BottomSheetHeaderGlass from '../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';

interface ConnectionDetailsProps {
  route: {
    params: {
      connectionDateTime?: number;
    };
  };
}

const ConnectionDetails = (props: ConnectionDetailsProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const { connectionDateTime = 123456789 } = props.route.params;

  const { styles } = useStyles(styleSheet, {});

  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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
    <BottomSheet ref={sheetRef} goBack={handleGoBack}>
      <View style={styles.container}>
        <BottomSheetHeaderGlass isGlass={isGlassHeader}>
          {strings('permissions.connection_details_title')}
        </BottomSheetHeaderGlass>
        <View style={styles.descriptionContainer}>
          <Text variant={TextVariant.BodyMd}>
            {strings('permissions.connection_details_description', {
              connectionDateTime: formatConnectionDate(connectionDateTime),
            })}
          </Text>
        </View>
        <View style={styles.buttonsContainer}>
          <Button
            style={styles.button}
            size={ButtonSize.Lg}
            variant={ButtonVariant.Primary}
            onPress={onDismiss}
          >
            {strings('permissions.got_it')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
};

export default ConnectionDetails;
