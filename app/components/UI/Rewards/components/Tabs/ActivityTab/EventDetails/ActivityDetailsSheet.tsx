import React from 'react';
import {
  Text,
  TextVariant,
  TextColor,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../../constants/navigation/Routes';
import { ModalAction, ModalType } from '../../../RewardsBottomSheetModal';
import { strings } from '../../../../../../../../locales/i18n';
import { getEventDetails } from '../../../../utils/eventDetailsUtils';
import { DetailsRow, GenericEventDetails } from './GenericEventDetails';
import { SwapEventDetails } from './SwapEventDetails';
import { CardEventDetails } from './CardEventDetails';
import { MusdDepositEventDetails } from './MusdDepositEventDetails';
import {
  PointsEventDto,
  SeasonActivityTypeDto,
} from '../../../../../../../core/Engine/controllers/rewards-controller/types';
import { resolveTemplate } from '../../../../utils/formatUtils';

interface ActivityDetailsSheetProps {
  event: PointsEventDto;
  activityTypes: SeasonActivityTypeDto[];
  accountName?: string;
  confirmAction?: ModalAction;
}

// Main dispatcher component
export const ActivityDetailsSheet: React.FC<ActivityDetailsSheetProps> = ({
  event,
  accountName,
  activityTypes,
}) => {
  const matchingActivityType = activityTypes.find(
    (activity) => activity.type === event.type,
  );

  const extraDetails =
    matchingActivityType && event.payload ? (
      <DetailsRow label={strings('rewards.events.description')}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {resolveTemplate(
            matchingActivityType.description,
            (event.payload ?? {}) as Record<string, string>,
          )}
        </Text>
      </DetailsRow>
    ) : null;

  switch (event.type) {
    case 'SWAP':
      return (
        <SwapEventDetails
          event={event as Extract<PointsEventDto, { type: 'SWAP' }>}
          accountName={accountName}
        />
      );
    case 'CARD':
      return (
        <CardEventDetails
          event={event as Extract<PointsEventDto, { type: 'CARD' }>}
          accountName={accountName}
        />
      );
    case 'MUSD_DEPOSIT':
      return (
        <MusdDepositEventDetails
          event={event as Extract<PointsEventDto, { type: 'MUSD_DEPOSIT' }>}
          accountName={accountName}
        />
      );
    default:
      return (
        <GenericEventDetails
          event={event}
          accountName={accountName}
          extraDetails={extraDetails}
        />
      );
  }
};

// Helper to open the Rewards bottom sheet with the activity details content
export const openActivityDetailsSheet = (
  navigation: ReturnType<typeof useNavigation>,
  props: ActivityDetailsSheetProps,
) => {
  const {
    event,
    activityTypes,
    accountName,
    confirmAction = {
      label: strings('navigation.close'),
      onPress: () => undefined,
      variant: ButtonVariant.Secondary,
    },
  } = props;
  const eventDetails = getEventDetails(event, activityTypes, accountName);

  navigation.navigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
    title: eventDetails.title,
    description: (
      <ActivityDetailsSheet
        event={event}
        accountName={accountName}
        activityTypes={activityTypes}
      />
    ),
    type: ModalType.Confirmation,
    showIcon: false,
    confirmAction,
    showCancelButton: false,
  });
};

export default ActivityDetailsSheet;
