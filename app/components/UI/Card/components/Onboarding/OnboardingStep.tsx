import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  type LayoutChangeEvent,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useFocusEffect } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, TitleStandard } from '@metamask/design-system-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useCardHeaderHandlers,
  type CardHeaderMode,
} from '../../hooks/useCardHeaderHandlers';
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import FooterGlass, {
  type FooterGlassButtonProps,
} from '../../../../../component-library/components-temp/FooterGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';

interface OnboardingStepProps {
  title: string;
  description?: string;
  /** Scrollable step content: fields and any form-level error. */
  formFields: React.ReactNode;
  /**
   * Consent, legal or clickwrap copy rendered in the pinned footer, directly
   * above the primary button.
   */
  footerContent?: React.ReactNode;
  /** Footer Primary button (FooterGlass). */
  primaryButtonProps?: FooterGlassButtonProps;
  /** Footer Secondary button (FooterGlass). */
  secondaryButtonProps?: FooterGlassButtonProps;
  /** Footer Tertiary button (FooterGlass). */
  tertiaryButtonProps?: FooterGlassButtonProps;
  /**
   * Controls the in-screen header rendered via HeaderStandardGlass.
   * Navigator headers are hidden; onboarding screens own their header chrome.
   */
  headerMode?: CardHeaderMode;
  /**
   * Optional override for the back header action when `headerMode` is `"back"`.
   * Use for multi-step screens that share one route (back should change local
   * step state instead of calling `navigation.goBack()`).
   */
  onBackPress?: () => void;
}

/**
 * Shared layout for Card onboarding steps.
 *
 * The title block is MMDS `TitleStandard` (title plus `bottomLabel`
 * description, built-in spacing), as in the shipped KYC VerifyIdentity and
 * PartnerTerms screens, with 16pt to the form.
 *
 * Buttons render through the shared `FooterGlass`, pinned outside the scroll
 * and lifted above the keyboard. The pinned container (pt-4, bottom inset plus
 * pb-2, KAV offset) matches the shipped MFA StepLayout. Consent and legal copy
 * (`footerContent`) sits in the footer above the primary button. The gap
 * between footer buttons is kept at 8pt (`gap-2`), overriding FooterGlass's
 * 16pt, pending a design decision.
 *
 * Each step asserts the status bar style for the current theme on focus and
 * when the theme changes. CardWelcome forces light content over its purple art
 * and only restores on blur, so without this a step could keep dark-content
 * (invisible time and icons) in dark mode.
 */
const OnboardingStep = ({
  title,
  description,
  formFields,
  footerContent,
  primaryButtonProps,
  secondaryButtonProps,
  tertiaryButtonProps,
  headerMode = 'none',
  onBackPress,
}: OnboardingStepProps) => {
  const tw = useTailwind();
  const { bottom } = useSafeAreaInsets();
  const headerHandlers = useCardHeaderHandlers(headerMode);
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const isDarkTheme = useTheme().themeAppearance === AppThemeKey.dark;
  // Spacing from the Tailwind scale: 8pt under the footer buttons (pb-2, on
  // top of the home indicator inset) and a 16pt gap between the footer and
  // the keyboard (pb-4).
  const footerBottomPadding = Number(tw.style('pb-2').paddingBottom ?? 0);
  const keyboardGap = Number(tw.style('pb-4').paddingBottom ?? 0);
  // The pinned footer sits between the scroll content and the keyboard, so
  // the focused field has to clear the footer as well as the keyboard.
  const [footerHeight, setFooterHeight] = useState(0);
  const handleFooterLayout = useCallback((event: LayoutChangeEvent) => {
    setFooterHeight(event.nativeEvent.layout.height);
  }, []);

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(
        isDarkTheme ? 'light-content' : 'dark-content',
        true,
      );
    }, [isDarkTheme]),
  );
  const resolvedHeaderHandlers =
    headerMode === 'back' && onBackPress
      ? { ...headerHandlers, onBack: onBackPress }
      : headerHandlers;

  return (
    <Box twClassName="flex-1 bg-default">
      {headerMode !== 'none' ? (
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          includesTopInset
          {...resolvedHeaderHandlers}
        />
      ) : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        // Over the keyboard the footer keeps a 24pt gap rather than the
        // home indicator inset.
        keyboardVerticalOffset={keyboardGap - bottom}
        style={tw.style('flex-1')}
      >
        <KeyboardAwareScrollView
          contentContainerStyle={tw.style('flex-grow px-4 pb-6 gap-4')}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}
          keyboardShouldPersistTaps="handled"
          // Scrolls the focused field into view above the pinned footer.
          bottomOffset={footerHeight + keyboardGap}
          disableScrollOnKeyboardHide
          testID="onboarding-step-scroll"
        >
          <TitleStandard
            title={title}
            titleProps={{ testID: 'onboarding-step-title' }}
            bottomLabel={description}
            bottomLabelProps={{ testID: 'onboarding-step-description' }}
            twClassName="shrink-0"
          />
          <Box testID="onboarding-step-form" twClassName="gap-4 flex-1">
            {formFields}
          </Box>
        </KeyboardAwareScrollView>

        {footerContent ||
        primaryButtonProps ||
        secondaryButtonProps ||
        tertiaryButtonProps ? (
          <Box
            testID="onboarding-step-actions"
            twClassName="px-4 pt-4"
            style={{ paddingBottom: footerBottomPadding + bottom }}
            onLayout={handleFooterLayout}
          >
            {footerContent ? (
              <Box testID="onboarding-step-footer-content" twClassName="pb-4">
                {footerContent}
              </Box>
            ) : null}
            <FooterGlass
              twClassName="px-0 gap-2"
              primaryButtonProps={primaryButtonProps}
              secondaryButtonProps={secondaryButtonProps}
              tertiaryButtonProps={tertiaryButtonProps}
            />
          </Box>
        ) : null}
      </KeyboardAvoidingView>
    </Box>
  );
};

export default OnboardingStep;
