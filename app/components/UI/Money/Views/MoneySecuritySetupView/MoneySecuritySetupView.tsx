import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, type TextLayoutEvent } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import MoneySecuritySetupImage from '../../../../../images/money-security-setup.png';
import { MoneySecuritySetupViewTestIds } from './MoneySecuritySetupView.testIds';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import { useMoneySecurityMethods } from '../../hooks/useMoneySecurityMethods';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 22,
  },
  artwork: {
    height: 104,
    width: 104,
  },
  centeredText: {
    textAlign: 'center',
  },
  methodsCard: {
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  methodIcon: {
    width: 24,
  },
  methodIconTopAligned: {
    marginTop: 3,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});

interface SecurityMethodRowProps {
  iconName: IconName;
  title: string;
  description: string;
  isComplete?: boolean;
}

const SecurityMethodRow = ({
  iconName,
  title,
  description,
  isComplete = false,
}: SecurityMethodRowProps) => {
  const [titleLineCount, setTitleLineCount] = useState(1);
  const [descriptionLineCount, setDescriptionLineCount] = useState(1);
  const hasThreeOrMoreLines = titleLineCount + descriptionLineCount >= 3;

  const handleTitleLayout = useCallback(({ nativeEvent }: TextLayoutEvent) => {
    setTitleLineCount(nativeEvent.lines.length);
  }, []);
  const handleDescriptionLayout = useCallback(
    ({ nativeEvent }: TextLayoutEvent) => {
      setDescriptionLineCount(nativeEvent.lines.length);
    },
    [],
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={
        hasThreeOrMoreLines ? BoxAlignItems.Start : BoxAlignItems.Center
      }
      gap={3}
      twClassName="py-2"
    >
      <Box
        style={[
          styles.methodIcon,
          hasThreeOrMoreLines && styles.methodIconTopAligned,
        ]}
      >
        <Icon
          name={iconName}
          size={IconSize.Md}
          color={IconColor.IconDefault}
        />
      </Box>
      <Box twClassName="flex-1">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          onTextLayout={handleTitleLayout}
        >
          {title}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextAlternative}
          onTextLayout={handleDescriptionLayout}
        >
          {description}
        </Text>
      </Box>
      {isComplete ? (
        <Icon
          name={IconName.Check}
          size={IconSize.Lg}
          color={IconColor.SuccessDefault}
        />
      ) : null}
    </Box>
  );
};

const MoneySecuritySetupView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const insets = useSafeAreaInsets();
  const { passkeyCount } = useMoneyFinishSetup();
  const { isAuthenticatorAdded } = useMoneySecurityMethods(passkeyCount);

  const handleGetStarted = useCallback(() => {
    if (passkeyCount > 0) {
      navigation.navigate(Routes.MONEY.AUTHENTICATOR, {
        entryPoint: 'protect_money',
      });
      return;
    }
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_PASSKEY_SHEET,
      params: { continueToAuthenticatorSetup: true },
    });
  }, [navigation, passkeyCount]);

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="bg-default"
      testID={MoneySecuritySetupViewTestIds.CONTAINER}
    >
      <Box style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={() => navigation.goBack()}
          accessibilityLabel={strings('money.security_setup.back')}
          testID={MoneySecuritySetupViewTestIds.BACK_BUTTON}
        />
      </Box>

      <Box style={styles.content}>
        <Box style={styles.hero}>
          <Image
            source={MoneySecuritySetupImage}
            style={styles.artwork}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text
            variant={TextVariant.HeadingLg}
            fontWeight={FontWeight.Bold}
            style={styles.centeredText}
            twClassName="mt-3"
          >
            {strings('money.security_setup.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
            style={styles.centeredText}
            twClassName="mt-2"
          >
            {strings('money.security_setup.description')}
          </Text>
        </Box>

        <Box style={styles.methodsCard} twClassName="bg-muted mt-9">
          <SecurityMethodRow
            iconName={IconName.Key}
            title={strings('money.security_setup.passkey_title')}
            description={strings(
              passkeyCount > 0
                ? 'money.security_setup.passkey_saved_description'
                : 'money.security_setup.passkey_description',
            )}
            isComplete={passkeyCount > 0}
          />
          <SecurityMethodRow
            iconName={IconName.QrCode}
            title={strings('money.security_setup.authenticator_title')}
            description={strings(
              isAuthenticatorAdded
                ? 'money.security_setup.authenticator_added_description'
                : 'money.security_setup.authenticator_description',
            )}
            isComplete={isAuthenticatorAdded}
          />
        </Box>
      </Box>

      <Box
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}
      >
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleGetStarted}
          testID={MoneySecuritySetupViewTestIds.GET_STARTED_BUTTON}
        >
          {strings(
            passkeyCount > 0
              ? 'money.security_setup.continue'
              : 'money.security_setup.get_started',
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default MoneySecuritySetupView;
