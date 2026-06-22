import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './DeveloperOptions.styles';
import Routes from '../../../../constants/navigation/Routes';
import {
  DEPOSIT_DEV_PREVIEW_SCREENS,
  createDevPreviewFiatOrder,
  type DepositDevPreviewScreen,
} from '../../../UI/Ramp/Deposit/dev/depositStackPreviewConfig';
import { addFiatOrder, updateFiatOrder } from '../../../../reducers/fiatOrders';

const DevDepositStackPreview = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOpenScreen = useCallback(
    (screen: DepositDevPreviewScreen) => {
      if (screen.seedFiatOrderState) {
        const previewOrder = createDevPreviewFiatOrder(screen.seedFiatOrderState);
        dispatch(addFiatOrder(previewOrder));
        dispatch(updateFiatOrder(previewOrder));
      }

      navigation.navigate(Routes.DEPOSIT.ID, {
        screen: Routes.DEPOSIT.ROOT,
        params: {
          devPreviewTarget: screen.target,
        },
      });
    },
    [dispatch, navigation],
  );

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.wrapper}>
      <HeaderStandard
        title={'Deposit screen preview'}
        onBack={handleBack}
        includesTopInset
        backButtonProps={{ testID: 'deposit-screen-preview-back-button' }}
      />
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {
            'Jump directly into legacy deposit stack screens with mock params.'
          }
        </Text>
        <Box twClassName="gap-2">
          {DEPOSIT_DEV_PREVIEW_SCREENS.map((screen) => (
            <Button
              key={screen.label}
              variant={ButtonVariant.Secondary}
              style={styles.accessory}
              size={ButtonSize.Lg}
              onPress={() => handleOpenScreen(screen)}
              isFullWidth
            >
              {screen.label}
            </Button>
          ))}
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DevDepositStackPreview;
