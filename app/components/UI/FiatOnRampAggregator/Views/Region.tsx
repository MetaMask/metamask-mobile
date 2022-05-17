import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import BaseText from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';
import useModalHandler from '../../../Base/hooks/useModalHandler';
import ScreenLayout from '../components/ScreenLayout';
import Box from '../components/Box';
import RegionModal from '../components/RegionModal';
import StyledButton from '../../StyledButton';
import { getFiatOnRampAggNavbar } from '../../Navbar';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { useFiatOnRampSDK, useSDKMethod } from '../sdk';
import RegionAlert from '../components/RegionAlert';
import SkeletonText from '../components/SkeletonText';
import ErrorView from '../components/ErrorView';
import ErrorViewWithReporting from '../components/ErrorViewWithReporting';
import { Region } from '../types';
import Routes from '../../../../constants/navigation/Routes';
import useAnalytics from '../hooks/useAnalytics';

// TODO: Convert into typescript and correctly type
const Text = BaseText as any;
const ListItem = BaseListItem as any;

const styles = StyleSheet.create({
  flexZero: {
    flex: 0,
  },
});

const RegionView = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const trackEvent = useAnalytics();
  const {
    selectedRegion,
    setSelectedRegion,
    setSelectedFiatCurrencyId,
    sdkError,
    selectedChainId,
  } = useFiatOnRampSDK();
  const [isRegionModalVisible, , showRegionModal, hideRegionModal] =
    useModalHandler(false);

  const [showAlert, setShowAlert] = useState(false);
  const [selectedUnsupportedLocation, setSelectedUnsupportedLocation] =
    useState<Region | Record<string, never>>({});
  const [{ data, isFetching, error }, queryGetCountries] =
    useSDKMethod('getCountries');

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
    navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.PAYMENT_METHOD);
  }, [navigation]);

  const handleRegionPress = useCallback(
    (region) => {
      setSelectedRegion(region);
      setSelectedFiatCurrencyId(null);
      hideRegionModal();
    },
    [hideRegionModal, setSelectedFiatCurrencyId, setSelectedRegion],
  );

  const updatedRegion = useMemo(() => {
    if (!selectedRegion || !data) return null;
    const allRegions: Region[] = data.reduce(
      (acc: Region[], region: Region) => [
        ...acc,
        region,
        ...((region.states as Region[]) || []),
      ],
      [],
    );
    return allRegions.find((region) => region.id === selectedRegion.id) ?? null;
  }, [data, selectedRegion]);

  useEffect(() => {
    if (updatedRegion?.unsupported) {
      setShowAlert(true);
      setSelectedUnsupportedLocation(updatedRegion);
      setSelectedRegion(null);
    }
  }, [updatedRegion, setSelectedRegion]);

  if (sdkError) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorViewWithReporting error={sdkError} />
        </ScreenLayout.Body>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout>
        <ScreenLayout.Body>
          <ErrorView description={error} ctaOnPress={queryGetCountries} />
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
      <RegionAlert
        isVisible={showAlert}
        subtitle={`${selectedUnsupportedLocation.emoji}   ${selectedUnsupportedLocation.name}`}
        dismiss={() => setShowAlert(false)}
        title={strings('fiat_on_ramp_aggregator.region.unsupported')}
        body={strings('fiat_on_ramp_aggregator.region.unsupported_description')}
        link={strings('fiat_on_ramp_aggregator.region.unsupported_link')}
      />
      <ScreenLayout.Body>
        <ScreenLayout.Content>
          <TouchableOpacity onPress={showRegionModal as () => void}>
            <Box>
              <ListItem.Content>
                <ListItem.Body>
                  {updatedRegion ? (
                    <Text>
                      {updatedRegion.emoji} {'   '}
                      {updatedRegion.name}
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
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <View>
            <StyledButton
              type="confirm"
              onPress={handleOnPress}
              disabled={!updatedRegion}
            >
              {strings('fiat_on_ramp_aggregator.continue')}
            </StyledButton>
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default RegionView;
