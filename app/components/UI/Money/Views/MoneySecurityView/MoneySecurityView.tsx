import React, { useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import {
  type RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneySecurityMethodsSection from '../../components/MoneySecurityMethodsSection';
import { useMoneySecurityToast } from '../../hooks/useMoneySecurityToast';
import type { MoneyNavigationParamList } from '../../types/navigation';
import { MoneySecurityViewTestIds } from './MoneySecurityView.testIds';

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerSpacer: { width: 40 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
});

const MoneySecurityView = () => {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<MoneyNavigationParamList, 'MoneyManageSecurity'>
    >();
  const route =
    useRoute<RouteProp<MoneyNavigationParamList, 'MoneyManageSecurity'>>();
  const insets = useSafeAreaInsets();
  const showSuccessToast = useMoneySecurityToast();

  useFocusEffect(
    useCallback(() => {
      const successToast = route.params?.successToast;
      if (!successToast) {
        return;
      }

      showSuccessToast(successToast);
      navigation.setParams({ successToast: undefined });
    }, [navigation, route.params?.successToast, showSuccessToast]),
  );

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="bg-default"
      testID={MoneySecurityViewTestIds.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-1 py-2"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={() => navigation.goBack()}
          accessibilityLabel={strings('money.security.back')}
          testID={MoneySecurityViewTestIds.BACK_BUTTON}
        />
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings('money.security.title')}
        </Text>
        <Box style={styles.headerSpacer} />
      </Box>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <MoneySecurityMethodsSection />
      </ScrollView>
    </Box>
  );
};

export default MoneySecurityView;
