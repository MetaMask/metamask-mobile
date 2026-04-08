import React from 'react';
import { Platform, Switch } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import ManageCardListItem from '../../../components/ManageCardListItem';
import { strings } from '../../../../../../../locales/i18n';
import { CardHomeSelectors } from '../CardHome.testIds';
import { CardType } from '../../../types';
import {
  CardStatus,
  FundingAssetStatus,
  type CardDetails,
  type CardAccountStatus,
  type CardFundingAsset,
  type CardProviderCapabilities,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

interface ManageCardOptionsProps {
  card: CardDetails | null | undefined;
  account: CardAccountStatus | null | undefined;
  primaryAsset: CardFundingAsset | null | undefined;
  capabilities: CardProviderCapabilities | null;
  isMetalCardCheckoutEnabled: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasSetupActions: boolean;
  hasAlertOnlyState: boolean;
  hasAnyAlerts: boolean;
  isFrozen: boolean;
  isFreezeLoading: boolean;
  isPinLoading: boolean;
  cardDetailsImageUrl: string | null;
  onViewCardDetails: () => void;
  onViewPin: () => void;
  onToggleFreeze: () => void;
  onManageSpendingLimit: () => void;
  onOrderMetalCard: () => void;
  onNavigateToCardPage: () => void;
  onCashback: () => void;
  onTravel: () => void;
}

const ManageCardOptions = ({
  card,
  account,
  primaryAsset,
  capabilities,
  isMetalCardCheckoutEnabled,
  isAuthenticated,
  isLoading,
  hasSetupActions,
  hasAlertOnlyState,
  hasAnyAlerts,
  isFrozen,
  isFreezeLoading,
  isPinLoading,
  cardDetailsImageUrl,
  onViewCardDetails,
  onViewPin,
  onToggleFreeze,
  onManageSpendingLimit,
  onOrderMetalCard,
  onNavigateToCardPage,
  onCashback,
  onTravel,
}: ManageCardOptionsProps) => {
  const tw = useTailwind();

  const isFullySetUp =
    !isLoading && !hasSetupActions && !hasAnyAlerts && isAuthenticated && card;

  const isEligibleForMetalCard =
    isMetalCardCheckoutEnabled &&
    isAuthenticated &&
    !!account?.shippingAddress &&
    card?.type === CardType.VIRTUAL &&
    isFullySetUp;

  const showSpendingLimitDescription =
    primaryAsset?.status === FundingAssetStatus.Active
      ? 'card.card_home.manage_card_options.manage_spending_limit_description_full'
      : 'card.card_home.manage_card_options.manage_spending_limit_description_restricted';

  return (
    <>
      <Box style={tw.style((hasSetupActions || hasAlertOnlyState) && 'hidden')}>
        {isEligibleForMetalCard && (
          <ManageCardListItem
            title={strings(
              'card.card_home.manage_card_options.order_metal_card',
            )}
            description={strings(
              'card.card_home.manage_card_options.order_metal_card_description',
            )}
            rightIcon={IconName.ArrowRight}
            onPress={onOrderMetalCard}
            testID={CardHomeSelectors.ORDER_METAL_CARD_ITEM}
          />
        )}
        {isAuthenticated && !isLoading && card && (
          <ManageCardListItem
            title={strings(
              cardDetailsImageUrl
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
        {isAuthenticated &&
          !isLoading &&
          card &&
          capabilities?.supportsPinView && (
            <ManageCardListItem
              title={strings('card.card_home.manage_card_options.view_pin')}
              description={strings(
                'card.card_home.manage_card_options.view_pin_description',
              )}
              onPress={onViewPin}
              isLoading={isPinLoading}
              testID={CardHomeSelectors.VIEW_PIN_BUTTON}
            />
          )}
        {isAuthenticated &&
          !isLoading &&
          card?.isFreezable &&
          card?.status !== CardStatus.BLOCKED && (
            <ManageCardListItem
              title={
                isFrozen
                  ? strings('card.card_home.manage_card_options.unfreeze_card')
                  : strings('card.card_home.manage_card_options.freeze_card')
              }
              description={strings(
                isFrozen
                  ? 'card.card_home.manage_card_options.unfreeze_card_description'
                  : 'card.card_home.manage_card_options.freeze_card_description',
              )}
              rightElement={
                <Switch
                  value={isFrozen}
                  onValueChange={isFreezeLoading ? undefined : onToggleFreeze}
                  disabled={isFreezeLoading}
                  style={tw.style(Platform.OS === 'ios' ? 'mr-2' : '')}
                  testID={CardHomeSelectors.FREEZE_CARD_TOGGLE}
                />
              }
              testID="freeze-card-list-item"
            />
          )}
        {!isLoading && (
          <ManageCardListItem
            title={strings(
              'card.card_home.manage_card_options.manage_spending_limit',
            )}
            description={strings(showSpendingLimitDescription)}
            rightIcon={IconName.ArrowRight}
            onPress={onManageSpendingLimit}
            testID={CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM}
          />
        )}
      </Box>
      {isFullySetUp && (
        <>
          <ManageCardListItem
            title={strings('card.card_home.manage_card_options.manage_card')}
            description={strings(
              'card.card_home.manage_card_options.advanced_card_management_description',
            )}
            rightIcon={IconName.Export}
            onPress={onNavigateToCardPage}
            testID={CardHomeSelectors.ADVANCED_CARD_MANAGEMENT_ITEM}
          />
          {isAuthenticated &&
            capabilities?.supportsCashback &&
            account?.verificationStatus === 'VERIFIED' && (
              <ManageCardListItem
                title={strings('card.card_home.manage_card_options.cashback')}
                description={strings(
                  card?.type === CardType.METAL
                    ? 'card.card_home.manage_card_options.cashback_description_metal'
                    : 'card.card_home.manage_card_options.cashback_description',
                )}
                rightIcon={IconName.ArrowRight}
                onPress={onCashback}
                testID={CardHomeSelectors.CASHBACK_ITEM}
              />
            )}
          <ManageCardListItem
            title={strings('card.card_home.manage_card_options.travel_title')}
            description={strings(
              'card.card_home.manage_card_options.travel_description',
            )}
            rightIcon={IconName.Export}
            onPress={onTravel}
            testID={CardHomeSelectors.TRAVEL_ITEM}
          />
        </>
      )}
    </>
  );
};

export default ManageCardOptions;
