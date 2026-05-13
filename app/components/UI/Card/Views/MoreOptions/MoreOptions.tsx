import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import {
  selectCardUserLocation,
  selectIsCardAuthenticated,
} from '../../../../../selectors/cardController';
import { selectMetalCardCheckoutFeatureFlag } from '../../../../../selectors/featureFlagController/card';
import { strings } from '../../../../../../locales/i18n';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import ManageCardListItem from '../../components/ManageCardListItem';
import { useCardHomeData } from '../../hooks/useCardHomeData';
import { useCardHomeActions } from '../CardHome/hooks/useCardHomeActions';
import { CardType } from '../../types';
import { CardStatus } from '../../../../../core/Engine/controllers/card-controller/provider-types';

const MoreOptions = () => {
  const tw = useTailwind();
  const { data, isLoading, primaryToken } = useCardHomeData();
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const userLocation = useSelector(selectCardUserLocation);
  const isMetalCardCheckoutEnabled = useSelector(
    selectMetalCardCheckoutFeatureFlag,
  );

  const isFrozen = data?.card?.status === CardStatus.FROZEN;
  const hasSetupActions = (data?.actions ?? []).some(
    (a) => a.type === 'enable_card',
  );
  const actions = useCardHomeActions({ data, primaryToken, isFrozen });

  const isFullySetUp =
    !isLoading && !hasSetupActions && isAuthenticated && !!data?.card;

  // Travel + TOS stay available for cardholders even when logged out; tapping
  // routes through useCardHomeActions, which re-auths when needed.
  const showTravelEntry = isFullySetUp || (!isLoading && !isAuthenticated);

  const isEligibleForMetalCard =
    isMetalCardCheckoutEnabled &&
    isAuthenticated &&
    userLocation === 'us' &&
    !!data?.account?.shippingAddress &&
    data?.card?.type === CardType.VIRTUAL &&
    isFullySetUp;

  return (
    <ScrollView
      style={tw.style('flex-1 bg-background-default')}
      contentContainerStyle={tw.style('pt-2 pb-8')}
    >
      <Box>
        {isEligibleForMetalCard && (
          <ManageCardListItem
            title={strings(
              'card.card_home.manage_card_options.order_metal_card',
            )}
            description={strings(
              'card.card_home.manage_card_options.order_metal_card_description',
            )}
            rightIcon={IconName.ArrowRight}
            onPress={actions.orderMetalCardAction}
          />
        )}

        {showTravelEntry && (
          <ManageCardListItem
            title={strings('card.card_home.manage_card_options.travel_title')}
            description={strings(
              'card.card_home.manage_card_options.travel_description',
            )}
            rightIcon={IconName.Export}
            onPress={actions.navigateToTravelPage}
          />
        )}

        <ManageCardListItem
          title={strings('card.card_home.manage_card_options.card_tos_title')}
          description=""
          rightIcon={IconName.Export}
          onPress={actions.navigateToCardTosPage}
        />

        {isAuthenticated && (
          <TouchableOpacity
            onPress={actions.logoutAction}
            style={tw.style('px-4 py-4')}
          >
            <Text variant={TextVariant.BodyMd} color={TextColor.ErrorDefault}>
              {strings('card.card_home.logout')}
            </Text>
          </TouchableOpacity>
        )}
      </Box>
    </ScrollView>
  );
};

export default MoreOptions;
