import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  IconAlertSeverity,
  TitleAlert,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import VbaOnboardingPlaceholder from './VbaOnboardingPlaceholder';

export const VbaOnboardingErrorSelectorsIDs = {
  CONTAINER: 'vba-onboarding-error-container',
  BACK_BUTTON: 'vba-onboarding-error-back-button',
  ILLUSTRATION: 'vba-onboarding-error-illustration',
  LIST: 'vba-onboarding-error-list',
  ITEM: 'vba-onboarding-error-item',
  PRIMARY_BUTTON: 'vba-onboarding-error-primary-button',
  SECONDARY_BUTTON: 'vba-onboarding-error-secondary-button',
} as const;

export interface VbaOnboardingErrorItem {
  id: string;
  icon: IconName;
  title: string;
  description: string;
}

export interface VbaOnboardingErrorAction {
  label: string;
  onPress: () => void | Promise<void>;
  testID?: string;
}

export interface VbaOnboardingErrorProps {
  title: string;
  description: string;
  /**
   * Checklist rows in the gray list. Omit this when the view has no rows.
   */
  items?: VbaOnboardingErrorItem[];
  primaryAction: VbaOnboardingErrorAction;
  /**
   * Optional second button, such as a help action under the primary button.
   */
  secondaryAction?: VbaOnboardingErrorAction;
  /**
   * Header graphic. Defaults to a placeholder SVG until a Rive animation replaces it.
   */
  illustration?: React.ReactNode;
  /**
   * Overrides the scroll container testID when an existing screen keeps its own id.
   */
  testID?: string;
  /**
   * Overrides the header back button testID.
   */
  backButtonTestID?: string;
  /**
   * Header back handler. Defaults to popping this screen.
   */
  onBack?: () => void;
}

type PendingAction = 'primary' | 'secondary';

const VbaOnboardingErrorItemRow = ({
  item,
}: {
  item: VbaOnboardingErrorItem;
}) => (
  <ListItem
    avatar={
      <Icon name={item.icon} size={IconSize.Md} color={IconColor.IconDefault} />
    }
    title={item.title}
    description={item.description}
    descriptionProps={{
      variant: TextVariant.BodySm,
      fontWeight: FontWeight.Regular,
      color: TextColor.TextAlternative,
    }}
    testID={`${VbaOnboardingErrorSelectorsIDs.ITEM}-${item.id}`}
  />
);

/**
 * VBA onboarding action screen. Callers supply the copy, optional checklist,
 * and one or two buttons. Centered status copy stays on VbaOnboardingStatusScreen.
 */
const VbaOnboardingError = ({
  title,
  description,
  items = [],
  primaryAction,
  secondaryAction,
  illustration,
  testID = VbaOnboardingErrorSelectorsIDs.CONTAINER,
  backButtonTestID = VbaOnboardingErrorSelectorsIDs.BACK_BUTTON,
  onBack,
}: VbaOnboardingErrorProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }

    navigation.goBack();
  }, [navigation, onBack]);

  const runAction = useCallback(
    async (action: PendingAction, onPress: () => void | Promise<void>) => {
      if (pendingAction) {
        return;
      }

      setPendingAction(action);
      try {
        await onPress();
      } finally {
        setPendingAction(null);
      }
    },
    [pendingAction],
  );

  const handlePrimaryPress = useCallback(
    () => runAction('primary', primaryAction.onPress),
    [primaryAction.onPress, runAction],
  );

  const handleSecondaryPress = useCallback(() => {
    if (!secondaryAction) {
      return;
    }

    return runAction('secondary', secondaryAction.onPress);
  }, [runAction, secondaryAction]);

  const isBusy = pendingAction !== null;

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{
          testID: backButtonTestID,
        }}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow px-4 pb-6')}
        testID={testID}
      >
        <TitleAlert
          {...{
            severity: IconAlertSeverity.Info,
            title,
            description,
            titleProps: { twClassName: 'text-center' },
            // TitleAlert draws an IconAlert. These screens replace that glyph
            // with an 88pt frame. The artwork sits on the bottom edge, and the
            // 20pt margin plus TitleAlert's 4pt gap is the 24pt space above the title.
            topAccessory: (
              <Box
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.End}
                twClassName="mb-5 h-[88px] w-full"
                testID={VbaOnboardingErrorSelectorsIDs.ILLUSTRATION}
              >
                {illustration ?? <VbaOnboardingPlaceholder />}
              </Box>
            ),
          }}
        />
        {items.length > 0 ? (
          <Box
            twClassName="mt-[26px] overflow-hidden rounded-3xl bg-muted"
            testID={VbaOnboardingErrorSelectorsIDs.LIST}
          >
            {items.map((item) => (
              <VbaOnboardingErrorItemRow key={item.id} item={item} />
            ))}
          </Box>
        ) : null}
      </ScrollView>
      <Box twClassName="gap-2 px-4 pb-2 pt-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={pendingAction === 'primary'}
          isDisabled={isBusy}
          onPress={handlePrimaryPress}
          testID={
            primaryAction.testID ??
            VbaOnboardingErrorSelectorsIDs.PRIMARY_BUTTON
          }
        >
          {primaryAction.label}
        </Button>
        {secondaryAction ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            isLoading={pendingAction === 'secondary'}
            isDisabled={isBusy}
            onPress={handleSecondaryPress}
            testID={
              secondaryAction.testID ??
              VbaOnboardingErrorSelectorsIDs.SECONDARY_BUTTON
            }
          >
            {secondaryAction.label}
          </Button>
        ) : null}
      </Box>
    </SafeAreaView>
  );
};

export default VbaOnboardingError;
