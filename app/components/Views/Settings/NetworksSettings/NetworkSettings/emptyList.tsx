import React from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  BannerAlert,
  BannerAlertSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import { CHAINLIST_URL } from '../../../../../constants/urls';
import Routes from '../../../../../constants/navigation/Routes';

interface Props {
  goToCustomNetwork: () => void;
}

const EmptyPopularList = ({ goToCustomNetwork }: Props) => {
  const navigation = useNavigation<AppNavigationProp>();

  const goToBrowserTab = () => {
    navigation.navigate('BrowserTabHome', {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: CHAINLIST_URL,
        timestamp: Date.now(),
      },
    });
  };

  return (
    <BannerAlert
      severity={BannerAlertSeverity.Info}
      twClassName="mx-4 mt-5"
      description={
        <Text variant={TextVariant.BodySm}>
          {`${strings('networks.empty_popular_networks')} `}
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.PrimaryDefault}
            suppressHighlighting
            onPress={goToBrowserTab}
          >
            {`${strings('networks.add_other_network_here')} `}
          </Text>
          {`${strings('networks.you_can')} `}
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.PrimaryDefault}
            suppressHighlighting
            onPress={goToCustomNetwork}
          >
            {strings('networks.add_network')}
          </Text>
        </Text>
      }
    />
  );
};

export default EmptyPopularList;
