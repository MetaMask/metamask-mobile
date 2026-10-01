import React, { useCallback, useRef, useState } from 'react';
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
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  ButtonsAlignment,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { METAMASK_PRIVACY_POLICY_URL, METAMASK_TERMS_URL } from './constants';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';
import LegalLink from './components/LegalLink';
import { useKycSessionDisclaimers } from './hooks/useKycSessionDisclaimers';

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
    <Icon name={icon} size={IconSize.Md} color={IconColor.IconDefault} />
    <Text variant={TextVariant.BodyMd}>{children}</Text>
  </Box>
);

// Collapsible row for the "Data and privacy" sub-topics; each manages its
// own expand state since rows don't affect each other.
const AccordionRow = ({
  title,
  defaultExpanded = false,
  testID,
  children,
}: {
  title: string;
  defaultExpanded?: boolean;
  testID: string;
  children: React.ReactNode;
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const chevronRotation = useSharedValue(defaultExpanded ? 180 : 0);

  const animatedChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const toggle = useCallback(() => {
    setIsExpanded((prev) => {
      chevronRotation.value = withTiming(prev ? 0 : 180, {
        duration: CHEVRON_ANIMATION_DURATION,
        easing: Easing.out(Easing.ease),
      });
      return !prev;
    });
  }, [chevronRotation]);

  return (
    <Box>
      <Pressable onPress={toggle} testID={testID}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="py-2"
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {title}
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
      {isExpanded ? (
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="pb-3"
        >
          {children}
        </Text>
      ) : null}
      <Box twClassName="h-px bg-border-muted" />
    </Box>
  );
};

interface VbaVerifyIdentityProps {
  onSuccess: () => void | Promise<void>;
}

const VbaVerifyIdentity = ({ onSuccess }: VbaVerifyIdentityProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { disclaimers, isLoading, error, retry } = useKycSessionDisclaimers();
  const [isDataAndPrivacyExpanded, setIsDataAndPrivacyExpanded] =
    useState(false);
  const [isConfirmSheetOpen, setIsConfirmSheetOpen] = useState(false);
  const confirmSheetRef = useRef<BottomSheetRef>(null);
  const chevronRotation = useSharedValue(0);

  // The user can't continue without seeing idOS / SumSub terms.
  const canContinue = !isLoading && !error && Boolean(disclaimers?.length);

  const animatedChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const handleBack = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  const handleOpenConfirmSheet = useCallback(() => {
    if (!canContinue) {
      return;
    }
    setIsConfirmSheetOpen(true);
  }, [canContinue]);

  const handleConfirmSheetClosed = useCallback(() => {
    setIsConfirmSheetOpen(false);
  }, []);

  const handleDismissConfirmSheet = useCallback(() => {
    confirmSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirmSheetConfirm = useCallback(() => {
    confirmSheetRef.current?.onCloseBottomSheet(() => {
      onSuccess();
    });
  }, [onSuccess]);

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

        {isDataAndPrivacyExpanded ? (
          <Box>
            <AccordionRow
              title={strings(
                'virtual_bank_account.verify_identity.what_we_collect_title',
              )}
              testID={VbaVerifyIdentitySelectorsIDs.WHAT_WE_COLLECT_TOGGLE}
            >
              {strings(
                'virtual_bank_account.verify_identity.what_we_collect_description',
              )}
            </AccordionRow>
            <AccordionRow
              title={strings(
                'virtual_bank_account.verify_identity.how_we_store_data_title',
              )}
              testID={VbaVerifyIdentitySelectorsIDs.HOW_WE_STORE_DATA_TOGGLE}
            >
              {strings(
                'virtual_bank_account.verify_identity.how_we_store_data_description',
              )}
            </AccordionRow>
            <AccordionRow
              title={strings(
                'virtual_bank_account.verify_identity.how_to_delete_title',
              )}
              testID={VbaVerifyIdentitySelectorsIDs.HOW_TO_DELETE_TOGGLE}
            >
              {strings(
                'virtual_bank_account.verify_identity.how_to_delete_description',
              )}
            </AccordionRow>
          </Box>
        ) : null}

        <Box twClassName="mt-4 gap-1">
          <LegalLink
            onPress={openMetaMaskPrivacyPolicy}
            testID={VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK}
          >
            {strings(
              'virtual_bank_account.verify_identity.metamask_privacy_policy',
            )}
          </LegalLink>
          <LegalLink
            onPress={openMetaMaskTerms}
            testID={VbaVerifyIdentitySelectorsIDs.METAMASK_TERMS_LINK}
          >
            {strings('virtual_bank_account.verify_identity.metamask_terms')}
          </LegalLink>
          {isLoading ? (
            <Box
              testID={VbaVerifyIdentitySelectorsIDs.DISCLAIMERS_LOADING}
              twClassName="gap-1 py-1"
            >
              <Skeleton height={16} width="70%" />
              <Skeleton height={16} width="55%" />
              <Skeleton height={16} width="65%" />
              <Skeleton height={16} width="50%" />
            </Box>
          ) : error ? (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Start}
              twClassName="gap-2 py-1"
              testID={VbaVerifyIdentitySelectorsIDs.DISCLAIMERS_ERROR}
            >
              <Box twClassName="shrink-0 pt-0.5">
                <Icon
                  name={IconName.Danger}
                  size={IconSize.Sm}
                  color={IconColor.ErrorDefault}
                />
              </Box>
              <Box twClassName="flex-1 gap-1">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.ErrorDefault}
                >
                  {strings(
                    'virtual_bank_account.verify_identity.disclaimers_error',
                  )}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.PrimaryDefault}
                  twClassName="underline"
                  onPress={retry}
                  testID={VbaVerifyIdentitySelectorsIDs.DISCLAIMERS_RETRY}
                >
                  {strings(
                    'virtual_bank_account.verify_identity.disclaimers_retry',
                  )}
                </Text>
              </Box>
            </Box>
          ) : (
            disclaimers?.map((disclaimer) => (
              <LegalLink
                key={disclaimer.id}
                onPress={() => Linking.openURL(disclaimer.url)}
                testID={`${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-${disclaimer.id}`}
              >
                {disclaimer.title}
              </LegalLink>
            ))
          )}
        </Box>
      </ScrollView>

      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={!canContinue}
          onPress={handleOpenConfirmSheet}
          testID={VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON}
        >
          {strings('virtual_bank_account.verify_identity.button')}
        </Button>
      </Box>
      {isConfirmSheetOpen ? (
        <BottomSheet
          ref={confirmSheetRef}
          onClose={handleConfirmSheetClosed}
          testID={VbaVerifyIdentitySelectorsIDs.CONFIRM_SHEET}
        >
          <BottomSheetHeader>
            <Text variant={TextVariant.HeadingMd}>
              {strings(
                'virtual_bank_account.verify_identity.confirm_sheet_title',
              )}
            </Text>
          </BottomSheetHeader>
          <Box twClassName="px-4 pb-4">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings(
                'virtual_bank_account.verify_identity.confirm_sheet_description',
              )}
            </Text>
          </Box>
          <BottomSheetFooter
            buttonsAlignment={ButtonsAlignment.Vertical}
            secondaryButtonProps={{
              children: strings(
                'virtual_bank_account.verify_identity.confirm_sheet_cancel',
              ),
              onPress: handleDismissConfirmSheet,
              size: ButtonSize.Lg,
              isFullWidth: true,
              testID: VbaVerifyIdentitySelectorsIDs.CONFIRM_SHEET_CANCEL_BUTTON,
            }}
            primaryButtonProps={{
              children: strings(
                'virtual_bank_account.verify_identity.confirm_sheet_confirm',
              ),
              onPress: handleConfirmSheetConfirm,
              size: ButtonSize.Lg,
              isFullWidth: true,
              testID:
                VbaVerifyIdentitySelectorsIDs.CONFIRM_SHEET_CONFIRM_BUTTON,
            }}
          />
        </BottomSheet>
      ) : null}
    </SafeAreaView>
  );
};

export default VbaVerifyIdentity;
