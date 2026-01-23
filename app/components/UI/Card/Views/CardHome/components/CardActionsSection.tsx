import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import { strings } from '../../../../../../../locales/i18n';
import { CardHomeSelectors } from '../CardHome.testIds';
import type { CardHomeViewState } from '../CardHome.types';

interface CardActionsSectionProps {
  /** Current view state */
  viewState: CardHomeViewState;
  /** Whether data is loading */
  isLoading: boolean;
  /** Whether swap is enabled for priority token */
  isSwapEnabled: boolean;
  /** Callback for add funds action */
  onAddFunds: () => void;
  /** Callback for change asset action */
  onChangeAsset: () => void;
  /** Callback for enable card action (opens SpendingLimit screen) */
  onEnableCard: () => void;
}

/**
 * CardActionsSection Component
 *
 * Displays action buttons based on the current card state:
 * - Loading: Shows skeleton
 * - Legacy (no Baanx): Add Funds only
 * - Ready: Add Funds + Change Asset
 * - Setup required (needs delegation): Enable Card button
 * - Setup required (provisioning) or KYC pending: No buttons
 */
const CardActionsSection = ({
  viewState,
  isLoading,
  isSwapEnabled,
  onAddFunds,
  onChangeAsset,
  onEnableCard,
}: CardActionsSectionProps) => {
  const tw = useTailwind();

  // Loading state
  if (isLoading) {
    return (
      <Box twClassName="w-full mt-4">
        <Skeleton
          height={28}
          width={'100%'}
          style={tw.style('rounded-xl')}
          testID={CardHomeSelectors.ADD_FUNDS_BUTTON_SKELETON}
        />
      </Box>
    );
  }

  // Ready state features
  if (viewState.status === 'ready') {
    const { isBaanxLoginEnabled, canChangeAsset } = viewState.features;

    // Legacy cardholder mode (no Baanx login)
    if (!isBaanxLoginEnabled) {
      return (
        <Box twClassName="w-full mt-4">
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('card.card_home.add_funds')}
            size={ButtonSize.Lg}
            onPress={onAddFunds}
            width={ButtonWidthTypes.Full}
            testID={CardHomeSelectors.ADD_FUNDS_BUTTON}
          />
        </Box>
      );
    }

    // Full mode with both buttons
    return (
      <Box twClassName="w-full mt-4 gap-2 flex-row justify-between items-center">
        <Button
          variant={ButtonVariants.Secondary}
          style={tw.style('w-1/2', !isSwapEnabled && 'opacity-50')}
          label={strings('card.card_home.add_funds')}
          size={ButtonSize.Lg}
          onPress={onAddFunds}
          width={ButtonWidthTypes.Full}
          disabled={!isSwapEnabled}
          testID={CardHomeSelectors.ADD_FUNDS_BUTTON}
        />
        {canChangeAsset && (
          <Button
            variant={ButtonVariants.Secondary}
            style={tw.style('w-1/2')}
            label={strings('card.card_home.change_asset')}
            size={ButtonSize.Lg}
            onPress={onChangeAsset}
            width={ButtonWidthTypes.Full}
            testID={CardHomeSelectors.CHANGE_ASSET_BUTTON}
          />
        )}
      </Box>
    );
  }

  // Setup required state - show Enable Card button if canEnable (needs delegation)
  if (viewState.status === 'setup_required') {
    // Provisioning state (has delegation, waiting for card) - no actions
    if (viewState.isProvisioning) {
      return null;
    }

    // Needs delegation - show Enable Card button
    if (viewState.canEnable) {
      return (
        <Box twClassName="w-full mt-4">
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('card.card_home.enable_card_button_label')}
            size={ButtonSize.Lg}
            onPress={onEnableCard}
            width={ButtonWidthTypes.Full}
            testID={CardHomeSelectors.ENABLE_CARD_BUTTON}
          />
        </Box>
      );
    }
  }

  // KYC pending or other states - no actions
  return null;
};

export default CardActionsSection;
