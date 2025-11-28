import React from 'react';
import { ButtonVariant } from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../../constants/navigation/Routes';
import { ModalAction, ModalType } from '../../../RewardsBottomSheetModal';
import { strings } from '../../../../../../../../locales/i18n';
import { getEventDetails } from '../../../../utils/eventDetailsUtils';
import { GenericEventDetails } from './GenericEventDetails';
import { SwapEventDetails } from './SwapEventDetails';
import { CardEventDetails } from './CardEventDetails';
import { MusdDepositEventDetails } from './MusdDepositEventDetails';
import { PointsEventDto } from '../../../../../../../core/Engine/controllers/rewards-controller/types';

interface ActivityDetailsSheetProps {
  event: PointsEventDto;
  accountName?: string;
  confirmAction?: ModalAction;
}

// Main dispatcher component
export const ActivityDetailsSheet: React.FC<ActivityDetailsSheetProps> = ({
  event,
  accountName,
}) => {
  switch (event.type) {
    case 'SWAP':
      return <SwapEventDetails event={event} accountName={accountName} />;
    case 'CARD':
      return <CardEventDetails event={event} accountName={accountName} />;
    case 'MUSD_DEPOSIT':
      return (
        <MusdDepositEventDetails event={event} accountName={accountName} />
      );
    default:
      return <GenericEventDetails event={event} accountName={accountName} />;
  }
};

// Helper to open the Rewards bottom sheet with the activity details content
export const openActivityDetailsSheet = (
  navigation: ReturnType<typeof useNavigation>,
  props: ActivityDetailsSheetProps,
) => {
  const {
    event,
    accountName,
    confirmAction = {
      label: strings('navigation.close'),
      onPress: () => undefined,
      variant: ButtonVariant.Secondary,
    },
  } = props;
  const eventDetails = getEventDetails(event, accountName);

  navigation.navigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
    title: eventDetails.title,
    description: (
      <ActivityDetailsSheet event={event} accountName={accountName} />
    ),
    type: ModalType.Confirmation,
    showIcon: false,
    confirmAction,
    showCancelButton: false,
  });
};

export default ActivityDetailsSheet;
