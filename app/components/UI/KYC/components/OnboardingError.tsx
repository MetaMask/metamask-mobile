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
  IconName,
  ListItem,
  ListItemVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';

export const KycOnboardingErrorSelectorsIDs = {
  CONTAINER: 'kyc-onboarding-error-container',
  BACK_BUTTON: 'kyc-onboarding-error-back-button',
  LIST: 'kyc-onboarding-error-list',
  ITEM: 'kyc-onboarding-error-item',
  PRIMARY_BUTTON: 'kyc-onboarding-error-primary-button',
  SECONDARY_BUTTON: 'kyc-onboarding-error-secondary-button',
} as const;

export interface KycOnboardingErrorItem {
  id: string;
  icon: IconName;
  title: string;
  description: string;
}

export interface KycOnboardingErrorAction {
  label: string;
  onPress: () => void | Promise<void>;
  testID?: string;
}

export interface KycOnboardingErrorProps {
  title: string;
  description: string;
  /**
   * Checklist rows shown under the title. Omit this when the view has no rows.
   */
  items?: KycOnboardingErrorItem[];
  primaryAction: KycOnboardingErrorAction;
  /**
   * Optional second button, such as a help action under the primary button.
   */
  secondaryAction?: KycOnboardingErrorAction;
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

const KycOnboardingErrorItemRow = ({
  item,
}: {
  item: KycOnboardingErrorItem;
}) => (
  <ListItem
    variant={ListItemVariant.TwoLines}
    avatar={
      <AvatarIcon iconName={item.icon} severity={AvatarIconSeverity.Neutral} />
    }
    title={item.title}
    description={item.description}
    testID={`${KycOnboardingErrorSelectorsIDs.ITEM}-${item.id}`}
  />
);

/**
 * KYC error screen. Callers supply the copy, optional checklist, and one or
 * two buttons.
 */
const KycOnboardingError = ({
  title,
  description,
  items = [],
  primaryAction,
  secondaryAction,
  testID = KycOnboardingErrorSelectorsIDs.CONTAINER,
  backButtonTestID = KycOnboardingErrorSelectorsIDs.BACK_BUTTON,
  onBack,
}: KycOnboardingErrorProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
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
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
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
          <Box testID={KycOnboardingErrorSelectorsIDs.LIST}>
            {items.map((item) => (
              <KycOnboardingErrorItemRow key={item.id} item={item} />
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
            KycOnboardingErrorSelectorsIDs.PRIMARY_BUTTON
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
              KycOnboardingErrorSelectorsIDs.SECONDARY_BUTTON
            }
          >
            {secondaryAction.label}
          </Button>
        ) : null}
      </Box>
    </SafeAreaView>
  );
};

export default KycOnboardingError;
