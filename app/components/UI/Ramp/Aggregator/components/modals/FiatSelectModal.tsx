import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  TextInput,
  TouchableOpacity,
  View,
  TouchableWithoutFeedback,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/Ionicons';
import Fuse from 'fuse.js';
import { strings } from '../../../../../../../locales/i18n';
import ScreenLayout from '../ScreenLayout';
import ModalDragger from '../../../../../Base/ModalDragger';
import { useTheme } from '../../../../../../util/theme';
import { FiatCurrency } from '@consensys/on-ramp-sdk';
import createModalStyles from './Modal.styles';
import ListItem from '../../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';

const MAX_TOKENS_RESULTS = 20;

const Separator = () => {
  const { colors } = useTheme();
  const styles = createModalStyles(colors);
  return <View style={styles.separator} />;
};

interface Props {
  isVisible: boolean;
  dismiss: () => void;
  title?: string;
  description?: string;
  currencies?: FiatCurrency[] | null;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onItemPress: (currency: any) => void;
  excludeIds?: FiatCurrency['id'][];
}
function FiatSelectModal({
  isVisible,
  dismiss,
  title,
  description,
  currencies,
  onItemPress,
  excludeIds = [],
}: Props) {
  const { colors } = useTheme();
  const styles = createModalStyles(colors);
  const searchInput = useRef<TextInput>(null);
  const list = useRef<FlatList<FiatCurrency>>(null);
  const [searchString, setSearchString] = useState('');

  const excludedAddresses = useMemo(
    () => excludeIds.filter(Boolean).map((id) => id.toLowerCase()),
    [excludeIds],
  );

  const filteredTokens = useMemo(
    () =>
      currencies?.filter(
        (currency) => !excludedAddresses.includes(currency.id?.toLowerCase()),
      ) ?? [],
    [currencies, excludedAddresses],
  );

  const tokenFuse = useMemo(
    () =>
      new Fuse(filteredTokens, {
        shouldSort: true,
        threshold: 0.45,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['symbol', 'name'],
      }),
    [filteredTokens],
  );
  const tokenSearchResults = useMemo(
    () =>
      searchString.length > 0
        ? tokenFuse.search(searchString)?.slice(0, MAX_TOKENS_RESULTS)
        : filteredTokens,
    [searchString, tokenFuse, filteredTokens],
  );

  const renderItem = useCallback(
    ({ item }: { item: FiatCurrency }) => (
      <TouchableOpacity
        onPress={() => onItemPress(item)}
        accessibilityRole="button"
        accessible
      >
        <ListItem style={styles.listItem}>
          <ListItemColumn widthType={WidthType.Fill}>
            <Text>{item.name}</Text>
            <Text
              variant={TextVariant.BodyLGMedium}
              color={TextColor.Alternative}
            >
              {item.symbol}
            </Text>
          </ListItemColumn>
        </ListItem>
      </TouchableOpacity>
    ),
    [onItemPress, styles.listItem],
  );

  const handleSearchPress = () => searchInput?.current?.focus();

  const renderEmptyList = useMemo(
    () => (
      <View style={styles.emptyList}>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('fiat_on_ramp_aggregator.no_currency_match', {
            searchString,
          })}
        </Text>
      </View>
    ),
    [searchString, styles.emptyList],
  );

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchString(text);
    if (list.current) {
      list.current.scrollToOffset({ animated: false, offset: 0 });
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchString('');
    searchInput?.current?.focus();
  }, [setSearchString]);

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={dismiss}
      onBackButtonPress={dismiss}
      onSwipeComplete={dismiss}
      swipeDirection="down"
      propagateSwipe
      avoidKeyboard
      onModalHide={() => setSearchString('')}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      style={styles.modal}
    >
      <SafeAreaView style={styles.modalView}>
        <ModalDragger />
        <ScreenLayout>
          <ScreenLayout.Header
            bold
            title={title}
            description={description}
            descriptionStyle={styles.headerDescription}
          >
            <TouchableWithoutFeedback onPress={handleSearchPress}>
              <View style={styles.inputWrapper}>
                <Icon name="search" size={20} style={styles.searchIcon} />
                <TextInput
                  ref={searchInput}
                  style={styles.input}
                  placeholder={strings(
                    'fiat_on_ramp_aggregator.search_by_currency',
                  )}
                  placeholderTextColor={colors.text.muted}
                  value={searchString}
                  onChangeText={handleSearchTextChange}
                />
                {searchString.length > 0 && (
                  <TouchableOpacity onPress={handleClearSearch}>
                    <Icon
                      name="close-circle"
                      size={20}
                      style={styles.searchIcon}
                      color={colors.icon.alternative}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </ScreenLayout.Header>

          <ScreenLayout.Body>
            <View style={styles.resultsView}>
              <FlatList
                ref={list}
                style={styles.resultsView}
                keyboardDismissMode="none"
                keyboardShouldPersistTaps="always"
                data={tokenSearchResults}
                renderItem={renderItem}
                keyExtractor={(item: FiatCurrency) => item.id}
                ListEmptyComponent={renderEmptyList}
                ItemSeparatorComponent={Separator}
                ListFooterComponent={Separator}
                ListHeaderComponent={Separator}
              />
            </View>
          </ScreenLayout.Body>
        </ScreenLayout>
      </SafeAreaView>
    </Modal>
  );
}

export default FiatSelectModal;
