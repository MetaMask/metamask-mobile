import React, { useCallback } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
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
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import type { PerpsNavigationParamList } from '../controllers/types';
import Routes from '../../../../constants/navigation/Routes';

type PerpsWithdrawSuccessRouteProp = RouteProp<
  PerpsNavigationParamList,
  'PerpsWithdrawSuccess'
>;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    successContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    successIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.success.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    successTitle: {
      textAlign: 'center',
      marginBottom: 8,
    },
    successDescription: {
      textAlign: 'center',
      marginBottom: 32,
      maxWidth: 300,
    },
    actionButton: {
      width: '100%',
      marginTop: 'auto',
      marginBottom: 32,
    },
  });

const PerpsWithdrawSuccessView: React.FC = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const route = useRoute<PerpsWithdrawSuccessRouteProp>();

  const { amount } = route.params;

  const handleDone = useCallback(() => {
    navigation.navigate(Routes.PERPS.POSITIONS);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Icon
              name={IconName.Confirmation}
              size={IconSize.Lg}
              color={IconColor.OnColor}
            />
          </View>

          <Text variant={TextVariant.HeadingMD} style={styles.successTitle}>
            {strings('perps.withdrawal.success_title')}
          </Text>

          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.successDescription}
          >
            {strings('perps.withdrawal.success_description', { amount })}
          </Text>
        </View>

        <Button
          variant={ButtonVariants.Primary}
          label={strings('perps.withdrawal.done')}
          onPress={handleDone}
          width={ButtonWidthTypes.Full}
          style={styles.actionButton}
          testID="done-button"
        />
      </View>
    </SafeAreaView>
  );
};

export default PerpsWithdrawSuccessView;
