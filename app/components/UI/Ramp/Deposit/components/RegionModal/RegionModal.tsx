import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  DefaultSectionT,
  SafeAreaView,
  SectionList,
  SectionListData,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Modal from 'react-native-modal';
import Fuse from 'fuse.js';
import { strings } from '../../../../../../../locales/i18n';
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
  const modalStyles = createModalStyles(colors);
  const searchInput = useRef<TextInput>(null);
  const list = useRef<SectionList<DepositRegion>>(null);
  const [searchString, setSearchString] = useState('');

  const fuseData = useMemo(
    () =>
      new Fuse(data || [], {
        shouldSort: true,
        threshold: 0.2,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['name'],
      }),
    [data],
  );

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

    if (!data?.length) return [];

    const popularRegions = data.filter((region) => region.recommended);

    if (popularRegions.length) {
      return [
        {
          title: strings('fiat_on_ramp_aggregator.region.popular_regions'),
          data: popularRegions,
        },
        {
          title: strings('fiat_on_ramp_aggregator.region.regions'),
          data: data.filter((region) => !region.recommended),
        },
      ];
    }

    return [
      {
        title: null,
        data,
      },
    ];
  }, [searchString, data, fuseData]);

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
      onRegionPress(region);
    },
    [onRegionPress],
  );

  const renderRegionItem = useCallback(
    ({ item: region }: { item: DepositRegion }) => (
      <ListItemSelect
        style={[
          modalStyles.listItem,
          !region.supported && modalStyles.disabledItem,
        ]}
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
          <View style={modalStyles.region}>
            <View style={modalStyles.emoji}>
              <Text style={!region.supported && modalStyles.disabledText}>
                {region.flag}
              </Text>
            </View>
            <View>
              <Text
                variant={TextVariant.BodyLGMedium}
                style={!region.supported && modalStyles.disabledText}
              >
                {region.name}
              </Text>
            </View>
          </View>
        </ListItemColumn>
      </ListItemSelect>
    ),
    [
      handleOnRegionPressCallback,
      selectedRegion,
      modalStyles.emoji,
      modalStyles.listItem,
      modalStyles.region,
      modalStyles.disabledItem,
      modalStyles.disabledText,
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
      <ListItem style={modalStyles.listItem}>
        <Text variant={TextVariant.BodyLGMedium}>{sectionTitle}</Text>
      </ListItem>
    );
  };

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
    setSearchString('');
  }, []);

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={dismiss}
      onBackButtonPress={dismiss}
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
            title={title}
            description={description}
            descriptionStyle={modalStyles.headerDescription}
          >
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
                    'fiat_on_ramp_aggregator.region.search_by_country',
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
                style={modalStyles.rowView}
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
