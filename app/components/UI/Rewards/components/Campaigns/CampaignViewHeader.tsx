import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { TextVariant } from '@metamask/design-system-react-native';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import Routes from '../../../../../constants/navigation/Routes';
import { getCampaignMechanicsButtonProps } from '../../utils/campaignHeaderUtils';

interface CampaignViewHeaderProps {
  title: string;
  backButtonTestID: string;
  mechanicsButtonTestID: string;
  hasCampaign: boolean;
  campaignId: string;
  /**
   * When true, the header follows the glass treatment. Callers pass the
   * glass-headers flag. Omit it to keep the plain compact header.
   */
  isGlass?: boolean;
}

const CampaignViewHeader: React.FC<CampaignViewHeaderProps> = ({
  title,
  backButtonTestID,
  mechanicsButtonTestID,
  hasCampaign,
  campaignId,
  isGlass = false,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  return (
    <HeaderStandardGlass
      isGlass={isGlass}
      isFloating={false}
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
