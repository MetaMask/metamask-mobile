import React, { useCallback, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import styles from './Regions.styles';

import Text from '../../../../Base/Text';
import BaseListItem from '../../../../Base/ListItem';
import useModalHandler from '../../../../Base/hooks/useModalHandler';

import ScreenLayout from '../../components/ScreenLayout';
import Box from '../../components/Box';
import RegionModal from '../../components/RegionModal';
import RegionAlert from '../../components/RegionAlert';
import SkeletonText from '../../components/SkeletonText';
import ErrorView from '../../components/ErrorView';
import ErrorViewWithReporting from '../../components/ErrorViewWithReporting';

import StyledButton from '../../../StyledButton';
import { getFiatOnRampAggNavbar } from '../../../Navbar';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import { createPaymentMethodsNavDetails } from '../PaymentMethods';

import { useFiatOnRampSDK } from '../../sdk';
import { Region } from '../../types';
import useAnalytics from '../../hooks/useAnalytics';
import useRegions from '../../hooks/useRegions';

// TODO: Convert into typescript and correctly type
const ListItem = BaseListItem as any;

export const createRegionsNavDetails = createNavigationDetails(
  Routes.FIAT_ON_RAMP_AGGREGATOR.REGION,
);

const RegionsView = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const trackEvent = useAnalytics();
  const {
    setSelectedRegion,
    setSelectedFiatCurrencyId,
    sdkError,
    selectedChainId,
  } = useFiatOnRampSDK();
  const [isRegionModalVisible, , showRegionModal, hideRegionModal] =
    useModalHandler(false);

  const {
    data,
    isFetching,
    error,
    query: queryGetCountries,
    selectedRegion,
    unsupportedRegion,
    clearUnsupportedRegion,
  } = useRegions();

  const handleCancelPress = useCallback(() => {
    trackEvent('ONRAMP_CANCELED', {
      location: 'Region Screen',
      chain_id_destination: selectedChainId,
    });
  }, [selectedChainId, trackEvent]);

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: strings('fiat_on_ramp_aggregator.region.buy_crypto_tokens'),
          showBack: false,
        },
        colors,
        handleCancelPress,
      ),
    );
  }, [navigation, colors, handleCancelPress]);

  const handleOnPress = useCallback(() => {
    navigation.navigate(...createPaymentMethodsNavDetails());
  }, [navigation]);

  const handleRegionPress = useCallback(
    (region: Region) => {
      setSelectedRegion(region);
      setSelectedFiatCurrencyId(null);
      hideRegionModal();
    },
    [hideRegionModal, setSelectedFiatCurrencyId, setSelectedRegion],
  );

  if (sdkError) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorViewWithReporting error={sdkError} location={'Region Screen'} />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView
            description={error}
            ctaOnPress={queryGetCountries}
            location={'Region Screen'}
          />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (isFetching || !data) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content>
            <SkeletonText small center spacingVertical />
            <SkeletonText thin spacingVertical />
            <SkeletonText thin center large spacingBottom />
            <Box>
              <SkeletonText thin medium />
            </Box>
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScreenLayout.Header
        title={strings('fiat_on_ramp_aggregator.region.your_region')}
        description={strings('fiat_on_ramp_aggregator.region.description')}
      />
      <ScreenLayout.Body>
        <ScreenLayout.Content>
          <TouchableOpacity
            onPress={showRegionModal}
            accessibilityRole="button"
          >
            <Box>
              <ListItem.Content>
                <ListItem.Body>
                  {selectedRegion ? (
                    <Text>
                      {selectedRegion.emoji} {'   '}
                      {selectedRegion.name}
                    </Text>
                  ) : (
                    <Text>
                      {strings('fiat_on_ramp_aggregator.region.select_region')}
                    </Text>
                  )}
                </ListItem.Body>
                <ListItem.Amounts style={styles.flexZero}>
                  <FontAwesome
                    name="caret-down"
                    size={15}
                    color={colors.icon.default}
                  />
                </ListItem.Amounts>
              </ListItem.Content>
            </Box>
          </TouchableOpacity>
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <View>
            <StyledButton
              type="confirm"
              onPress={handleOnPress}
              disabled={!selectedRegion}
            >
              {strings('fiat_on_ramp_aggregator.continue')}
            </StyledButton>
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>

      <RegionAlert
        isVisible={Boolean(unsupportedRegion)}
        subtitle={`${unsupportedRegion?.emoji}   ${unsupportedRegion?.name}`}
        dismiss={clearUnsupportedRegion}
        title={strings('fiat_on_ramp_aggregator.region.unsupported')}
        body={strings('fiat_on_ramp_aggregator.region.unsupported_description')}
        link={strings('fiat_on_ramp_aggregator.region.unsupported_link')}
      />

      <RegionModal
        isVisible={isRegionModalVisible}
        title={strings('fiat_on_ramp_aggregator.region.select_region_title')}
        description={strings(
          'fiat_on_ramp_aggregator.region.select_country_registered',
        )}
        data={data}
        dismiss={hideRegionModal as () => void}
        onRegionPress={handleRegionPress}
        location={'Region Screen'}
      />
    </ScreenLayout>
  );
};

export default RegionsView;
