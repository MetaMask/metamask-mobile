import React, { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import {
  IDOS_PRIVACY_POLICY_URL,
  IDOS_TERMS_URL,
  METAMASK_PRIVACY_POLICY_URL,
  METAMASK_TERMS_URL,
  SUMSUB_PRIVACY_POLICY_URL,
  SUMSUB_TERMS_URL,
} from './constants';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';

const CHEVRON_ANIMATION_DURATION = 200;

const StepRow = ({
  icon,
  children,
}: {
  icon: IconName;
  children: React.ReactNode;
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="gap-3"
  >
    {/* Plain icon, no background chip — matches the benefit rows on the
    Get Pix Key screen for a consistent look across both VBA KYC screens. */}
    <Icon name={icon} size={IconSize.Md} color={IconColor.IconDefault} />
    <Text variant={TextVariant.BodyMd}>{children}</Text>
  </Box>
);

const LegalLinkRow = ({
  onPress,
  testID,
  children,
}: {
  onPress: () => void;
  testID: string;
  children: string;
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="gap-1 py-1"
  >
    <Text
      variant={TextVariant.BodyMd}
      twClassName="underline"
      onPress={onPress}
      testID={testID}
    >
      {children}
    </Text>
    <Icon
      name={IconName.Export}
      size={IconSize.Sm}
      color={IconColor.IconDefault}
    />
  </Box>
);

const VbaVerifyIdentity = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [isDataAndPrivacyExpanded, setIsDataAndPrivacyExpanded] =
    useState(true);
  const chevronRotation = useSharedValue(180);

  const animatedChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleContinue = useCallback(() => {
    // The next screen in the VBA KYC flow isn't built yet.
  }, []);

  const toggleDataAndPrivacy = useCallback(() => {
    setIsDataAndPrivacyExpanded((prev) => {
      chevronRotation.value = withTiming(prev ? 0 : 180, {
        duration: CHEVRON_ANIMATION_DURATION,
        easing: Easing.out(Easing.ease),
      });
      return !prev;
    });
  }, [chevronRotation]);

  const openMetaMaskPrivacyPolicy = useCallback(
    () => Linking.openURL(METAMASK_PRIVACY_POLICY_URL),
    [],
  );
  const openMetaMaskTerms = useCallback(
    () => Linking.openURL(METAMASK_TERMS_URL),
    [],
  );
  const openIdosPrivacyPolicy = useCallback(
    () => Linking.openURL(IDOS_PRIVACY_POLICY_URL),
    [],
  );
  const openIdosTerms = useCallback(() => Linking.openURL(IDOS_TERMS_URL), []);
  const openSumsubPrivacyPolicy = useCallback(
    () => Linking.openURL(SUMSUB_PRIVACY_POLICY_URL),
    [],
  );
  const openSumsubTerms = useCallback(
    () => Linking.openURL(SUMSUB_TERMS_URL),
    [],
  );

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{ testID: VbaVerifyIdentitySelectorsIDs.BACK_BUTTON }}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow px-4 pb-4')}
        testID={VbaVerifyIdentitySelectorsIDs.CONTAINER}
      >
        <Text variant={TextVariant.HeadingLg} twClassName="mt-2">
          {strings('virtual_bank_account.verify_identity.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2"
        >
          {strings('virtual_bank_account.verify_identity.description')}
        </Text>

        <Box twClassName="mt-4 p-4 gap-4 rounded-xl bg-muted">
          <StepRow icon={IconName.Card}>
            {strings('virtual_bank_account.verify_identity.step_upload_id')}
          </StepRow>
          <StepRow icon={IconName.Camera}>
            {strings('virtual_bank_account.verify_identity.step_take_selfie')}
          </StepRow>
          <StepRow icon={IconName.UserCheck}>
            {strings(
              'virtual_bank_account.verify_identity.step_confirm_details',
            )}
          </StepRow>
        </Box>

        <Pressable
          onPress={toggleDataAndPrivacy}
          testID={VbaVerifyIdentitySelectorsIDs.DATA_AND_PRIVACY_TOGGLE}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="mt-6 py-2"
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings(
                'virtual_bank_account.verify_identity.data_and_privacy_title',
              )}
            </Text>
            <Animated.View style={animatedChevronStyle}>
              <Icon
                name={IconName.ArrowDown}
                size={IconSize.Md}
                color={IconColor.IconDefault}
              />
            </Animated.View>
          </Box>
        </Pressable>
        <Box twClassName="h-px bg-border-muted" />

        {isDataAndPrivacyExpanded ? (
          <Box twClassName="mt-3 gap-1">
            <LegalLinkRow
              onPress={openMetaMaskPrivacyPolicy}
              testID={
                VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK
              }
            >
              {strings(
                'virtual_bank_account.verify_identity.metamask_privacy_policy',
              )}
            </LegalLinkRow>
            <LegalLinkRow
              onPress={openMetaMaskTerms}
              testID={VbaVerifyIdentitySelectorsIDs.METAMASK_TERMS_LINK}
            >
              {strings('virtual_bank_account.verify_identity.metamask_terms')}
            </LegalLinkRow>
            <LegalLinkRow
              onPress={openIdosPrivacyPolicy}
              testID={VbaVerifyIdentitySelectorsIDs.IDOS_PRIVACY_POLICY_LINK}
            >
              {strings(
                'virtual_bank_account.verify_identity.idos_privacy_policy',
              )}
            </LegalLinkRow>
            <LegalLinkRow
              onPress={openIdosTerms}
              testID={VbaVerifyIdentitySelectorsIDs.IDOS_TERMS_LINK}
            >
              {strings('virtual_bank_account.verify_identity.idos_terms')}
            </LegalLinkRow>
            <LegalLinkRow
              onPress={openSumsubPrivacyPolicy}
              testID={VbaVerifyIdentitySelectorsIDs.SUMSUB_PRIVACY_POLICY_LINK}
            >
              {strings(
                'virtual_bank_account.verify_identity.sumsub_privacy_policy',
              )}
            </LegalLinkRow>
            <LegalLinkRow
              onPress={openSumsubTerms}
              testID={VbaVerifyIdentitySelectorsIDs.SUMSUB_TERMS_LINK}
            >
              {strings('virtual_bank_account.verify_identity.sumsub_terms')}
            </LegalLinkRow>
          </Box>
        ) : null}
      </ScrollView>

      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleContinue}
          testID={VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON}
        >
          {strings('virtual_bank_account.verify_identity.button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default VbaVerifyIdentity;
