import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  AvatarIcon,
  AvatarIconSeverity,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  IconName,
  ListItem,
  ListItemVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';

export const VbaOnboardingErrorSelectorsIDs = {
  CONTAINER: 'vba-onboarding-error-container',
  BACK_BUTTON: 'vba-onboarding-error-back-button',
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
   * Checklist rows shown under the title. Omit this when the view has no rows.
   */
  items?: VbaOnboardingErrorItem[];
  primaryAction: VbaOnboardingErrorAction;
  /**
   * Optional second button, such as a help action under the primary button.
   */
  secondaryAction?: VbaOnboardingErrorAction;
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
    variant={ListItemVariant.TwoLines}
    avatar={
      <AvatarIcon iconName={item.icon} severity={AvatarIconSeverity.Neutral} />
    }
    title={item.title}
    description={item.description}
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
        contentContainerStyle={tw.style('flex-grow pb-6')}
        testID={testID}
      >
        <TitleStandard
          title={title}
          bottomLabel={description}
          twClassName="px-4 pb-4"
        />
        {items.length > 0 ? (
          <Box testID={VbaOnboardingErrorSelectorsIDs.LIST}>
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
