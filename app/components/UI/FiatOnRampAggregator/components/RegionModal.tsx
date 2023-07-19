import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
  View,
  TouchableWithoutFeedback,
  FlatList,
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
import { Region, ScreenLocation } from '../types';
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
  onRegionPress: (region: Region) => any;
  location?: ScreenLocation;
}

const RegionModal: React.FC<Props> = ({
  isVisible,
  title,
  description,
  data,
  onRegionPress,
  dismiss,
  location,
}: Props) => {
  const { colors } = useTheme();
  const trackEvent = useAnalytics();
  const styles = createStyles();
  const modalStyles = createModalStyles(colors);
  const searchInput = useRef<TextInput>(null);
  const list = useRef<FlatList<Region>>(null);
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
  const dataFuse = useMemo(
    () =>
      new Fuse(currentData, {
        shouldSort: true,
        threshold: 0.2,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['name'],
      }),
    [currentData],
  );

  const dataSearchResults = useMemo(
    () =>
      searchString.length > 0
        ? dataFuse.search(searchString)?.slice(0, MAX_REGION_RESULTS)
        : currentData,
    [searchString, dataFuse, currentData],
  );

  const handleOnRegionPressCallback = useCallback(
    (region: Region) => {
      if (region.states) {
        setActiveView(RegionViewType.STATE);
        setRegionInTransit(region);
        setCurrentData(region.states as Region[]);
        setSearchString('');
        return;
      }
      if (region.unsupported) {
        setUnsupportedRegion(region);
        setShowAlert(true);
      } else {
        onRegionPress(region);
      }
      trackEvent('ONRAMP_REGION_SELECTED', {
        is_unsupported: region.unsupported,
        country_onramp_id: regionInTransit?.id ?? region.id,
        state_onramp_id: regionInTransit ? region.id : undefined,
        location,
      });
    },
    [location, onRegionPress, regionInTransit, trackEvent],
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
                  <Text black>{region.name}</Text>
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
    [handleOnRegionPressCallback, styles.emoji, styles.listItem, styles.region],
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

  const handleRegionBackButton = useCallback(() => {
    setActiveView(RegionViewType.COUNTRY);
    setCurrentData(data || []);
    setSearchString('');
  }, [data]);

  const onBackButtonPress = useCallback(() => {
    if (activeView === RegionViewType.STATE) {
      handleRegionBackButton();
    } else {
      dismiss?.();
    }
  }, [activeView, dismiss, handleRegionBackButton]);

  const handleSearchTextChange = useCallback((text) => {
    setSearchString(text);
    if (list?.current)
      list.current?.scrollToOffset({ animated: false, offset: 0 });
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchString('');
    searchInput?.current?.focus();
  }, [setSearchString]);

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
        {activeView === RegionViewType.COUNTRY ? (
          <ScreenLayout>
            <ScreenLayout.Header
              bold
              title={title}
              description={description}
              descriptionStyle={modalStyles.headerDescription}
            >
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
                      'fiat_on_ramp_aggregator.region.search_by_country',
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
                        color={colors.icon.alternative}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </ScreenLayout.Header>

            <ScreenLayout.Body>
              <View style={modalStyles.resultsView}>
                <FlatList
                  ref={list}
                  style={styles.rowView}
                  keyboardDismissMode="none"
                  keyboardShouldPersistTaps="always"
                  data={dataSearchResults}
                  renderItem={renderRegionItem}
                  keyExtractor={(item) => item.id}
                  ListEmptyComponent={renderEmptyList}
                  ItemSeparatorComponent={Separator}
                  ListFooterComponent={Separator}
                  ListHeaderComponent={Separator}
                />
              </View>
            </ScreenLayout.Body>
          </ScreenLayout>
        ) : (
          <ScreenLayout>
            <ScreenLayout.Header>
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
                      'fiat_on_ramp_aggregator.region.search_by_state',
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
                <FlatList
                  keyboardDismissMode="none"
                  style={styles.rowView}
                  keyboardShouldPersistTaps="always"
                  data={dataSearchResults}
                  renderItem={renderRegionItem}
                  keyExtractor={(item) => item.id}
                  ListEmptyComponent={renderEmptyList}
                  ItemSeparatorComponent={Separator}
                  ListFooterComponent={Separator}
                  ListHeaderComponent={Separator}
                />
              </View>
            </ScreenLayout.Body>
          </ScreenLayout>
        )}

        <RegionAlert
          isVisible={showAlert}
          subtitle={`${unsupportedRegion.emoji}  ${unsupportedRegion.name}`}
          dismiss={() => setShowAlert(false)}
          title={strings('fiat_on_ramp_aggregator.region.unsupported')}
          body={strings(
            'fiat_on_ramp_aggregator.region.unsupported_description',
          )}
          link={strings('fiat_on_ramp_aggregator.region.unsupported_link')}
        />
      </SafeAreaView>
    </Modal>
  );
};

export default RegionModal;
