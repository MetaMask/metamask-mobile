import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import ManageCardListItem from '../../../components/ManageCardListItem';
import { strings } from '../../../../../../../locales/i18n';
import { CardHomeSelectors } from '../CardHome.testIds';
import { AllowanceState, CardTokenAllowance } from '../../../types';
import type { CardHomeFeatures } from '../CardHome.types';

interface CardManageSectionProps {
  /** Feature flags from ready state */
  features: CardHomeFeatures;
  /** Whether setup is needed (hides manage options) */
  needsSetup: boolean;
  /** Whether user is in KYC pending/unverified state (only show ToS + logout) */
  isKYCPending: boolean;
  /** Whether card details image is currently showing */
  isCardDetailsImageShowing: boolean;
  /** Priority token for allowance state check */
  priorityToken: CardTokenAllowance | null;
  /** Callback for view/hide card details */
  onViewCardDetails: () => void;
  /** Callback for manage spending limit */
  onManageSpendingLimit: () => void;
  /** Callback for navigate to card management page */
  onNavigateToCardPage: () => void;
  /** Callback for navigate to travel page */
  onNavigateToTravelPage: () => void;
  /** Callback for navigate to ToS page */
  onNavigateToCardTosPage: () => void;
  /** Callback for logout */
  onLogout: () => void;
}

/**
 * CardManageSection Component
 *
 * Displays card management options like:
 * - View/Hide card details
 * - Manage spending limit
 * - Advanced card management
 * - Travel settings
 * - Terms of Service
 * - Logout
 */
const CardManageSection = ({
  features,
  needsSetup,
  isKYCPending,
  isCardDetailsImageShowing,
  priorityToken,
  onViewCardDetails,
  onManageSpendingLimit,
  onNavigateToCardPage,
  onNavigateToTravelPage,
  onNavigateToCardTosPage,
  onLogout,
}: CardManageSectionProps) => {
  const tw = useTailwind();

  const { isAuthenticated, canViewCardDetails, canManageSpendingLimit } =
    features;

  // When KYC is pending OR setup is required, only show ToS and Logout (no divider)
  // This applies to verified users without card/delegation too
  if ((isKYCPending || needsSetup) && isAuthenticated) {
    return (
      <>
        <TouchableOpacity
          onPress={onNavigateToCardTosPage}
          testID={CardHomeSelectors.CARD_TOS_ITEM}
          style={tw.style('py-4 px-4')}
        >
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-text-alternative"
          >
            {strings('card.card_home.manage_card_options.card_tos_title')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onLogout}
          testID={CardHomeSelectors.LOGOUT_ITEM}
          style={tw.style('py-4 px-4 mb-6')}
        >
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-text-alternative"
          >
            {strings('card.card_home.logout')}
          </Text>
        </TouchableOpacity>
      </>
    );
  }

  return (
    <>
      {/* Conditional options that hide during setup */}
      <Box style={tw.style(needsSetup && 'hidden')}>
        {canViewCardDetails && (
          <ManageCardListItem
            title={strings(
              isCardDetailsImageShowing
                ? 'card.card_home.manage_card_options.hide_card_details'
                : 'card.card_home.manage_card_options.view_card_details',
            )}
            description={strings(
              'card.card_home.manage_card_options.view_card_details_description',
            )}
            onPress={onViewCardDetails}
            testID={CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON}
          />
        )}
        {canManageSpendingLimit && (
          <ManageCardListItem
            title={strings(
              'card.card_home.manage_card_options.manage_spending_limit',
            )}
            description={strings(
              priorityToken?.allowanceState === AllowanceState.Enabled
                ? 'card.card_home.manage_card_options.manage_spending_limit_description_full'
                : 'card.card_home.manage_card_options.manage_spending_limit_description_restricted',
            )}
            rightIcon={IconName.ArrowRight}
            onPress={onManageSpendingLimit}
            testID={CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM}
          />
        )}
      </Box>

      {/* Always visible options */}
      <ManageCardListItem
        title={strings('card.card_home.manage_card_options.manage_card')}
        description={strings(
          'card.card_home.manage_card_options.advanced_card_management_description',
        )}
        rightIcon={IconName.Export}
        onPress={onNavigateToCardPage}
        testID={CardHomeSelectors.ADVANCED_CARD_MANAGEMENT_ITEM}
      />
      <ManageCardListItem
        title={strings('card.card_home.manage_card_options.travel_title')}
        description={strings(
          'card.card_home.manage_card_options.travel_description',
        )}
        rightIcon={IconName.Export}
        onPress={onNavigateToTravelPage}
        testID={CardHomeSelectors.TRAVEL_ITEM}
      />

      {/* Authenticated user options */}
      {isAuthenticated && (
        <>
          <Box twClassName="h-px mx-4 bg-border-muted" />
          <TouchableOpacity
            onPress={onNavigateToCardTosPage}
            testID={CardHomeSelectors.CARD_TOS_ITEM}
            style={tw.style('py-4 px-4')}
          >
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-text-alternative"
            >
              {strings('card.card_home.manage_card_options.card_tos_title')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onLogout}
            testID={CardHomeSelectors.LOGOUT_ITEM}
            style={tw.style('py-4 px-4 mb-6')}
          >
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-text-alternative"
            >
              {strings('card.card_home.logout')}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </>
  );
};

export default CardManageSection;
