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
import Fuse from 'fuse.js';
import { strings } from '../../../../../../../locales/i18n';
import Feather from 'react-native-vector-icons/Feather';
import ModalDragger from '../../../../../Base/ModalDragger';
import { DepositRegion } from '../../constants';
import { useTheme } from '../../../../../../util/theme';
import ListItemSelect from '../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import createModalStyles from './regionModal.styles';
import ListItem from '../../../../../../components/Base/ListItem';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';

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
    disabledItem: {
      opacity: 0.5,
    },
    disabledText: {
      color: 'gray',
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
  dismiss?: () => void;
  data?: DepositRegion[] | null;
  selectedRegion?: DepositRegion | null;
  onRegionPress: (region: DepositRegion) => void;
}

const RegionModal: React.FC<Props> = ({
  isVisible,
  title,
  description,
  data,
  selectedRegion,
  onRegionPress,
  dismiss,
}: Props) => {
  const { colors } = useTheme();
  const styles = createStyles();
  const modalStyles = createModalStyles(colors);
  const searchInput = useRef<TextInput>(null);
  const list = useRef<SectionList<DepositRegion>>(null);
  const [searchString, setSearchString] = useState('');
  const [currentData, setCurrentData] = useState(data || []);

  // local state variable to set the active view (countries vs. regions)
  const [activeView, setActiveView] = useState(RegionViewType.COUNTRY);
  // local state variable to save the country object in transite
  const [regionInTransit, setRegionInTransit] = useState<
    DepositRegion | Record<string, never>
  >({});

  const fuseData = useMemo(() => {
    const flatRegions: DepositRegion[] = currentData.reduce(
      (acc: DepositRegion[], region: DepositRegion) => [
        ...acc,
        region,
        ...((region.states as DepositRegion[]) || []),
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
    (region: DepositRegion) => {
      if (region.states) {
        setActiveView(RegionViewType.STATE);
        setRegionInTransit(region);
        setCurrentData(region.states as DepositRegion[]);
        setSearchString('');
        scrollToTop();
        return;
      }

      onRegionPress(region);
    },
    [onRegionPress, scrollToTop],
  );

  const renderRegionItem = useCallback(
    ({ item: region }: { item: DepositRegion }) => (
      <ListItemSelect
        style={[styles.listItem, !region.supported && styles.disabledItem]}
        isSelected={selectedRegion?.code === region.code}
        onPress={() => {
          if (region.supported) {
            handleOnRegionPressCallback(region);
          }
        }}
        accessibilityRole="button"
        accessible
        disabled={!region.supported}
      >
        <ListItemColumn widthType={WidthType.Fill}>
          <View style={styles.region}>
            <View style={styles.emoji}>
              <Text style={!region.supported && styles.disabledText}>
                {activeView === RegionViewType.STATE
                  ? regionInTransit?.flag
                  : region.flag}
              </Text>
            </View>
            <View>
              <Text
                variant={TextVariant.BodyLGMedium}
                style={!region.supported && styles.disabledText}
              >
                {region.name}
              </Text>
            </View>
          </View>
        </ListItemColumn>
        {region.states && region.supported && (
          <ListItemColumn>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Md}
              color={colors.icon.alternative}
            />
          </ListItemColumn>
        )}
      </ListItemSelect>
    ),
    [
      handleOnRegionPressCallback,
      selectedRegion,
      styles.emoji,
      styles.listItem,
      styles.region,
      styles.disabledItem,
      styles.disabledText,
      activeView,
      regionInTransit,
    ],
  );
  const handleSearchPress = () => searchInput?.current?.focus();

  const renderEmptyList = useMemo(
    () => (
      <View style={modalStyles.emptyList}>
        <Text variant={TextVariant.BodyLGMedium}>
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
    section: SectionListData<DepositRegion, DefaultSectionT>;
  }) => {
    if (!sectionTitle) return null;
    return (
      <ListItem style={styles.listItem}>
        <Text variant={TextVariant.BodyLGMedium}>{sectionTitle}</Text>
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
    (text: string) => {
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
                <Text variant={TextVariant.BodyLGMedium}>
                  {regionInTransit?.name}
                </Text>
                <View style={styles.ghostSpacer} />
              </ScreenLayout.Content>
            ) : null}

            <TouchableWithoutFeedback onPress={handleSearchPress}>
              <View style={modalStyles.inputWrapper}>
                <Icon
                  name={IconName.Search}
                  size={IconSize.Md}
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
                      name={IconName.Close}
                      size={IconSize.Md}
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
                keyExtractor={(item) => item.code}
                ListEmptyComponent={renderEmptyList}
                ItemSeparatorComponent={Separator}
                ListFooterComponent={Separator}
                stickySectionHeadersEnabled={false}
              />
            </View>
          </ScreenLayout.Body>
        </ScreenLayout>
      </SafeAreaView>
    </Modal>
  );
};

export default RegionModal;
