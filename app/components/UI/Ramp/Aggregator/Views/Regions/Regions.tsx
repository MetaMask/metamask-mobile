import React, { useCallback, useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import styles from './Regions.styles';

import useModalHandler from '../../../../../Base/hooks/useModalHandler';

import ScreenLayout from '../../components/ScreenLayout';
import Box from '../../components/Box';
import RegionModal from '../../components/RegionModal';
import RegionAlert from '../../components/RegionAlert';
import SkeletonText from '../../components/SkeletonText';
import ErrorView from '../../components/ErrorView';
import ErrorViewWithReporting from '../../components/ErrorViewWithReporting';

import StyledButton from '../../../../StyledButton';
import { getFiatOnRampAggNavbar } from '../../../../Navbar';
import { useTheme } from '../../../../../../util/theme';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { createNavigationDetails } from '../../../../../../util/navigation/navUtils';
import { createBuildQuoteNavDetails } from '../BuildQuote/BuildQuote';

import { useRampSDK } from '../../sdk';
import { Region } from '../../types';
import useAnalytics from '../../../hooks/useAnalytics';
import useRegions from '../../hooks/useRegions';

import ListItem from '../../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';

export const createRegionsNavDetails = createNavigationDetails(
  Routes.RAMP.REGION,
);

const RegionsView = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const trackEvent = useAnalytics();
  const {
    setSelectedRegion,
    setSelectedFiatCurrencyId,
    sdkError,
    isBuy,
    isSell,
    rampType,
  } = useRampSDK();
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

  const [isPristine, setIsPristine] = useState(true);

  const handleRegionSelectorPress = useCallback(() => {
    setIsPristine(false);
    showRegionModal();
  }, [showRegionModal, setIsPristine]);

  const handleCancelPress = useCallback(() => {
    if (isBuy) {
      trackEvent('ONRAMP_CANCELED', {
        location: 'Region Screen',
        chain_id_destination: 'unknown', // TODO: Replace with actual chainId
      });
    } else {
      trackEvent('OFFRAMP_CANCELED', {
        location: 'Region Screen',
        chain_id_source: 'unknown', // TODO: Replace with actual chainId
      });
    }
  }, [isBuy, trackEvent]);

  useEffect(() => {
    navigation.setOptions(
      getFiatOnRampAggNavbar(
        navigation,
        {
          title: strings(
            isBuy
              ? 'fiat_on_ramp_aggregator.region.buy_crypto_tokens'
              : 'fiat_on_ramp_aggregator.region.sell_crypto_tokens',
          ),
          showBack: false,
        },
        colors,
        handleCancelPress,
      ),
    );
  }, [isBuy, navigation, colors, handleCancelPress]);

  const handleOnPress = useCallback(() => {
    navigation.navigate(...createBuildQuoteNavDetails());
  }, [navigation]);

  useEffect(() => {
    if (
      selectedRegion &&
      !selectedRegion.unsupported &&
      ((isBuy && selectedRegion.support.buy) ||
        (isSell && selectedRegion.support.sell)) &&
      isPristine
    ) {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: Routes.RAMP.BUILD_QUOTE_HAS_STARTED,
            params: { showBack: false },
          },
        ],
      });
    }
  }, [handleOnPress, selectedRegion, isPristine, isBuy, isSell, navigation]);

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
        description={strings(
          isBuy
            ? 'fiat_on_ramp_aggregator.region.description'
            : 'fiat_on_ramp_aggregator.region.sell_description',
        )}
      />
      <ScreenLayout.Body>
        <ScreenLayout.Content>
          <TouchableOpacity
            onPress={handleRegionSelectorPress}
            accessibilityRole="button"
            accessible
          >
            <Box compact>
              <ListItem>
                <ListItemColumn widthType={WidthType.Fill}>
                  {selectedRegion ? (
                    <Text variant={TextVariant.BodyLGMedium}>
                      {selectedRegion.emoji} {'   '}
                      {selectedRegion.name}
                    </Text>
                  ) : (
                    <Text variant={TextVariant.BodyLGMedium}>
                      {strings('fiat_on_ramp_aggregator.region.select_region')}
                    </Text>
                  )}
                </ListItemColumn>
                <ListItemColumn style={styles.flexZero}>
                  <FontAwesome
                    name="caret-down"
                    size={15}
                    color={colors.icon.default}
                  />
                </ListItemColumn>
              </ListItem>
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
              disabled={
                !selectedRegion ||
                (isBuy && !selectedRegion.support.buy) ||
                (isSell && !selectedRegion.support.sell)
              }
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
        body={strings(
          'fiat_on_ramp_aggregator.region.unsupported_description',
          {
            rampType: strings(
              isBuy
                ? 'fiat_on_ramp_aggregator.buy'
                : 'fiat_on_ramp_aggregator.sell',
            ),
          },
        )}
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
        selectedRegion={selectedRegion}
        rampType={rampType}
      />
    </ScreenLayout>
  );
};

export default RegionsView;
