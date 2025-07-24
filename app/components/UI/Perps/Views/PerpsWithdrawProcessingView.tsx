import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';

import { strings } from '../../../../../locales/i18n';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import type { PerpsNavigationParamList } from '../controllers/types';
import Routes from '../../../../constants/navigation/Routes';

type PerpsWithdrawProcessingRouteProp = RouteProp<
  PerpsNavigationParamList,
  'PerpsWithdrawProcessing'
>;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    closeButton: {
      width: 24,
      height: 24,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    placeholder: {
      width: 24,
      height: 24,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    processingContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    processingIcon: {
      marginBottom: 24,
    },
    processingTitle: {
      textAlign: 'center',
      marginBottom: 16,
    },
    processingDescription: {
      textAlign: 'center',
      marginBottom: 32,
      maxWidth: 300,
      lineHeight: 20,
    },
    infoCard: {
      backgroundColor: colors.info.muted,
      borderRadius: 8,
      padding: 16,
      marginBottom: 32,
      alignItems: 'center',
    },
    infoText: {
      textAlign: 'center',
      lineHeight: 20,
    },
    actionButton: {
      width: '100%',
      marginTop: 'auto',
      marginBottom: 32,
    },
  });

const PerpsWithdrawProcessingView: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute<PerpsWithdrawProcessingRouteProp>();

  const { amount } = route.params;

  const handleClose = useCallback(() => {
    // Navigate back to positions view
    navigation.navigate(Routes.PERPS.POSITIONS);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.placeholder} />
        <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
          {strings('perps.withdrawal.processing_title')}
        </Text>
        <ButtonIcon
          iconName={IconName.Close}
          iconColor={IconColor.Default}
          onPress={handleClose}
          size={styles.closeButton}
          testID="close-button"
        />
      </View>

      <View style={styles.content}>
        <View style={styles.processingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.primary.default}
            style={styles.processingIcon}
          />

          <Text variant={TextVariant.HeadingMD} style={styles.processingTitle}>
            {strings('perps.withdrawal.processing_title')}
          </Text>

          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.processingDescription}
          >
            {strings('perps.withdrawal.processing_description')}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Info}
            style={styles.infoText}
          >
            {amount}
          </Text>
        </View>

        <Button
          variant={ButtonVariants.Primary}
          label={strings('perps.withdrawal.done')}
          onPress={handleClose}
          width={ButtonWidthTypes.Full}
          style={styles.actionButton}
          testID="done-button"
        />
      </View>
    </SafeAreaView>
  );
};

export default PerpsWithdrawProcessingView;
