import React, { type ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { CancelMembershipTestIds } from '../CancelMembership.testIds';
import HeaderBaseGlass from '../../../../../../component-library/components-temp/HeaderBaseGlass';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';

export interface CancelStepLayoutProps {
  title: string;
  titleTestId: string;
  children: ReactNode;
  onBack: () => void;
  onKeepMembership: () => void;
  onCancelConfirm: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}

/**
 * Shared chrome for the cancel survey steps: back header, scrollable title +
 * content, and the Keep / Cancel membership actions pinned to the bottom.
 */
const CancelStepLayout = ({
  title,
  titleTestId,
  children,
  onBack,
  onKeepMembership,
  onCancelConfirm,
  isSubmitting,
  errorMessage,
}: CancelStepLayoutProps) => {
  const tw = useTailwind();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;

  return (
    <>
      <HeaderBaseGlass
        isGlass={isGlassHeader}
        isFloating={false}
        textProps={{
          accessibilityRole: 'header',
          testID: titleTestId,
        }}
        startButtonIconProps={{
          iconName: IconName.ArrowLeft,
          onPress: onBack,
          accessibilityLabel: strings('navigation.back'),
          testID: CancelMembershipTestIds.BACK_BUTTON,
          isDisabled: isSubmitting,
        }}
      >
        {title}
      </HeaderBaseGlass>

      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('px-4 pt-2 pb-6')}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>

      {/* ── Bottom actions ─────────────────────────────────────────────────── */}
      <Box twClassName="px-4 pb-2 gap-y-4 w-full">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={onKeepMembership}
          testID={CancelMembershipTestIds.KEEP_BUTTON}
          isFullWidth
          isDisabled={isSubmitting}
        >
          {strings('pro_hub.cancel_membership.keep_membership')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={onCancelConfirm}
          testID={CancelMembershipTestIds.CANCEL_BUTTON}
          isFullWidth
          isDisabled={isSubmitting}
          isLoading={isSubmitting}
        >
          {strings('pro_hub.cancel_membership.cancel')}
        </Button>
        {errorMessage && (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            twClassName="text-center"
            testID={CancelMembershipTestIds.ERROR_MESSAGE}
          >
            {errorMessage}
          </Text>
        )}
      </Box>
    </>
  );
};

export default CancelStepLayout;
