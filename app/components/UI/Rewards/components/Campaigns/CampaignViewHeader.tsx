import React from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  HeaderStandard,
  TextVariant,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { getCampaignMechanicsButtonProps } from '../../utils/campaignHeaderUtils';

interface CampaignViewHeaderProps {
  title: string;
  backButtonTestID: string;
  mechanicsButtonTestID: string;
  hasCampaign: boolean;
  campaignId: string;
}

const CampaignViewHeader: React.FC<CampaignViewHeaderProps> = ({
  title,
  backButtonTestID,
  mechanicsButtonTestID,
  hasCampaign,
  campaignId,
}) => {
  const navigation = useNavigation();
  return (
    <HeaderStandard
      title={title}
      titleProps={{ variant: TextVariant.HeadingSm }}
      onBack={() => navigation.goBack()}
      backButtonProps={{ testID: backButtonTestID }}
      endButtonIconProps={getCampaignMechanicsButtonProps(
        hasCampaign,
        () =>
          navigation.navigate(Routes.REWARDS_CAMPAIGN_MECHANICS, {
            campaignId,
          }),
        mechanicsButtonTestID,
      )}
      includesTopInset
    />
  );
};

export default CampaignViewHeader;
