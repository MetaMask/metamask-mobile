import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  DefaultSectionT,
  SafeAreaView,
  SectionList,
  SectionListData,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/Ionicons';
import Fuse from 'fuse.js';
import { strings } from '../../../../../locales/i18n';
import ScreenLayout from './ScreenLayout';
import Feather from 'react-native-vector-icons/Feather';
import Text from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';
import ModalDragger from '../../../Base/ModalDragger';
import { useTheme } from '../../../../util/theme';
import RegionAlert from './RegionAlert';
import { RampType, Region, ScreenLocation } from '../types';
import useAnalytics from '../hooks/useAnalytics';
import createModalStyles from './modals/Modal.styles';

// TODO: Convert into typescript and correctly type
const ListItem = BaseListItem as any;

const MAX_REGION_RESULTS = 20;

enum RegionViewType {
  COUNTRY = 'COUNTRY',
  STATE = 'STATE',
}

const createStyles = () =>
  StyleSheet.create({
    rowView: {
      paddingHorizontal: 0,
    },
    subheader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      paddingVertical: 10,
    },
    ghostSpacer: {
      width: 20,
    },
    listItem: {
      paddingHorizontal: 24,
    },
    region: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    emoji: {
      paddingRight: 16,
    },
  });

const Separator = () => {
  const { colors } = useTheme();
  const styles = createModalStyles(colors);
  return <View style={styles.separator} />;
};

interface Props {
  isVisible?: boolean;
  title?: string;
  description?: string;
  dismiss?: () => any;
  data?: Region[] | null;
  selectedRegion?: Region | null;
  onRegionPress: (region: Region) => any;
  location?: ScreenLocation;
  rampType?: RampType;
}

const RegionModal: React.FC<Props> = ({
  isVisible,
  title,
  description,
  data,
  selectedRegion,
  onRegionPress,
  dismiss,
  location,
  rampType = RampType.BUY,
}: Props) => {
  const isBuy = rampType === RampType.BUY;
  const { colors } = useTheme();
  const trackEvent = useAnalytics();
  const styles = createStyles();
  const modalStyles = createModalStyles(colors);
  const searchInput = useRef<TextInput>(null);
  const list = useRef<SectionList<Region>>(null);
  const [searchString, setSearchString] = useState('');
  const [currentData, setCurrentData] = useState(data || []);

  // local state variable to set the active view (countries vs. regions)
  const [activeView, setActiveView] = useState(RegionViewType.COUNTRY);
  // local state variable to save the country object in transite
  const [regionInTransit, setRegionInTransit] = useState<
    Region | Record<string, never>
  >({});
  const [unsupportedRegion, setUnsupportedRegion] = useState<
    Region | Record<string, never>
  >({});
  const [showAlert, setShowAlert] = useState(false);

  const fuseData = useMemo(() => {
    const flatRegions: Region[] = currentData.reduce(
      (acc: Region[], region: Region) => [
        ...acc,
        region,
        ...((region.states as Region[]) || []),
      ],
      [],
    );
    return new Fuse(flatRegions, {
      shouldSort: true,
      threshold: 0.2,
      location: 0,
      distance: 100,
      maxPatternLength: 32,
      minMatchCharLength: 1,
      keys: ['name'],
    });
  }, [currentData]);

  const dataSearchResults = useMemo(() => {
    if (searchString.length > 0) {
      const results = fuseData
        .search(searchString)
        ?.slice(0, MAX_REGION_RESULTS);

      if (results?.length) {
        return [
          {
            title: null,
            data: results,
          },
        ];
      }
      return [];
    }

    if (!currentData?.length) return [];

    const popularRegions = currentData.filter((region) => region.recommended);

    if (popularRegions.length) {
      return [
        {
          title: strings('fiat_on_ramp_aggregator.region.popular_regions'),
          data: popularRegions,
        },
        {
          title: strings('fiat_on_ramp_aggregator.region.regions'),
          data: currentData.filter((region) => !region.recommended),
        },
      ];
    }

    return [
      {
        title: null,
        data: currentData,
      },
    ];
  }, [searchString, currentData, fuseData]);

  const scrollToTop = useCallback(() => {
    if (list?.current && dataSearchResults?.length) {
      list.current?.scrollToLocation({
        animated: false,
        itemIndex: 0,
        sectionIndex: 0,
      });
    }
  }, [dataSearchResults?.length]);

  const handleOnRegionPressCallback = useCallback(
    (region: Region) => {
      if (region.states) {
        setActiveView(RegionViewType.STATE);
        setRegionInTransit(region);
        setCurrentData(region.states as Region[]);
        setSearchString('');
        scrollToTop();
        return;
      }
      if (
        region.unsupported ||
        (isBuy && !region.support.buy) ||
        (!isBuy && !region.support.sell)
      ) {
        setUnsupportedRegion(region);
        setShowAlert(true);
      } else {
        onRegionPress(region);
      }

      trackEvent('RAMP_REGION_SELECTED', {
        is_unsupported_onramp: !region.support.buy,
        is_unsupported_offramp: !region.support.sell,
        country_id: regionInTransit?.id ?? region.id,
        state_id: regionInTransit ? region.id : undefined,
        location,
      });
    },
    [isBuy, location, onRegionPress, regionInTransit, scrollToTop, trackEvent],
  );

  const renderRegionItem = useCallback(
    ({ item: region }: { item: Region }) => (
      <TouchableOpacity
        onPress={() => handleOnRegionPressCallback(region)}
        accessibilityRole="button"
        accessible
      >
        <ListItem style={styles.listItem}>
          <ListItem.Content>
            <ListItem.Body>
              <View style={styles.region}>
                <View style={styles.emoji}>
                  <Text>{region.emoji}</Text>
                </View>
                <View>
                  <Text black bold={selectedRegion?.id === region.id}>
                    {region.name}
                  </Text>
                </View>
              </View>
            </ListItem.Body>
            {region.states && (
              <ListItem.Amounts>
                <Text primary big>
                  {'>'}
                </Text>
              </ListItem.Amounts>
            )}
          </ListItem.Content>
        </ListItem>
      </TouchableOpacity>
    ),
    [
      handleOnRegionPressCallback,
      selectedRegion,
      styles.emoji,
      styles.listItem,
      styles.region,
    ],
  );
  const handleSearchPress = () => searchInput?.current?.focus();

  const renderEmptyList = useMemo(
    () => (
      <View style={modalStyles.emptyList}>
        <Text>
          {strings('fiat_on_ramp_aggregator.region.no_region_results', {
            searchString,
          })}
        </Text>
      </View>
    ),
    [searchString, modalStyles.emptyList],
  );

  const renderSectionHeader = ({
    section: { title: sectionTitle },
  }: {
    section: SectionListData<Region, DefaultSectionT>;
  }) => {
    if (!sectionTitle) return null;
    return (
      <ListItem style={styles.listItem}>
        <Text>{sectionTitle}</Text>
      </ListItem>
    );
  };

  const handleRegionBackButton = useCallback(() => {
    setActiveView(RegionViewType.COUNTRY);
    setCurrentData(data || []);
    setSearchString('');
    scrollToTop();
  }, [data, scrollToTop]);

  const onBackButtonPress = useCallback(() => {
    if (activeView === RegionViewType.STATE) {
      handleRegionBackButton();
    } else {
      dismiss?.();
    }
  }, [activeView, dismiss, handleRegionBackButton]);

  const handleSearchTextChange = useCallback(
    (text) => {
      setSearchString(text);
      scrollToTop();
    },
    [scrollToTop],
  );

  const handleClearSearch = useCallback(() => {
    setSearchString('');
    searchInput?.current?.focus();
    scrollToTop();
  }, [scrollToTop]);

  const onModalHide = useCallback(() => {
    setActiveView(RegionViewType.COUNTRY);
    setRegionInTransit({});
    setCurrentData(data || []);
    setSearchString('');
  }, [data]);

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={dismiss}
      onBackButtonPress={onBackButtonPress}
      swipeDirection="down"
      onSwipeComplete={dismiss}
      propagateSwipe
      avoidKeyboard
      onModalHide={onModalHide}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      style={modalStyles.modal}
    >
      <SafeAreaView style={modalStyles.modalView}>
        <ModalDragger />
        <ScreenLayout>
          <ScreenLayout.Header
            bold
            title={activeView === RegionViewType.COUNTRY ? title : undefined}
            description={
              activeView === RegionViewType.COUNTRY ? description : undefined
            }
            descriptionStyle={modalStyles.headerDescription}
          >
            {activeView === RegionViewType.STATE ? (
              <ScreenLayout.Content style={styles.subheader}>
                <TouchableOpacity onPress={handleRegionBackButton}>
                  <Feather
                    name="chevron-left"
                    size={22}
                    color={colors.icon.default}
                  />
                </TouchableOpacity>
                <Text bold black>
                  {regionInTransit?.name}
                </Text>
                <View style={styles.ghostSpacer} />
              </ScreenLayout.Content>
            ) : null}

            <TouchableWithoutFeedback onPress={handleSearchPress}>
              <View style={modalStyles.inputWrapper}>
                <Icon
                  name="ios-search"
                  size={20}
                  style={modalStyles.searchIcon}
                />
                <TextInput
                  ref={searchInput}
                  style={modalStyles.input}
                  placeholder={strings(
                    activeView === RegionViewType.COUNTRY
                      ? 'fiat_on_ramp_aggregator.region.search_by_country'
                      : 'fiat_on_ramp_aggregator.region.search_by_state',
                  )}
                  placeholderTextColor={colors.text.muted}
                  value={searchString}
                  onChangeText={handleSearchTextChange}
                />
                {searchString.length > 0 && (
                  <TouchableOpacity onPress={handleClearSearch}>
                    <Icon
                      name="ios-close-circle"
                      size={20}
                      style={modalStyles.searchIcon}
                      color={colors.text.muted}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </ScreenLayout.Header>

          <ScreenLayout.Body>
            <View style={modalStyles.resultsView}>
              <SectionList
                ref={list}
                style={styles.rowView}
                keyboardDismissMode="none"
                keyboardShouldPersistTaps="always"
                sections={dataSearchResults}
                renderItem={renderRegionItem}
                renderSectionHeader={renderSectionHeader}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmptyList}
                ItemSeparatorComponent={Separator}
                ListFooterComponent={Separator}
                stickySectionHeadersEnabled={false}
              />
            </View>
          </ScreenLayout.Body>
        </ScreenLayout>

        <RegionAlert
          isVisible={showAlert}
          subtitle={`${unsupportedRegion.emoji}  ${unsupportedRegion.name}`}
          dismiss={() => setShowAlert(false)}
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
      </SafeAreaView>
    </Modal>
  );
};

export default RegionModal;
