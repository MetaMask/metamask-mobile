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
import Device from '../../../../../util/device';
import { strings } from '../../../../../../locales/i18n';
import { fontStyles } from '../../../../../styles/common';
import ScreenLayout from '../ScreenLayout';

import Text from '../../../../Base/Text';
import BaseListItem from '../../../../Base/ListItem';
import ModalDragger from '../../../../Base/ModalDragger';
import { useTheme } from '../../../../../util/theme';
import { Colors } from '../../../../../util/theme/models';
import { FiatCurrency } from '@consensys/on-ramp-sdk';

const MAX_TOKENS_RESULTS = 20;

// TODO: Convert into typescript and correctly type
const ListItem = BaseListItem as any;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    modal: {
      margin: 0,
      justifyContent: 'flex-end',
    },
    modalView: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      flex: 0.75,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 24,
      marginTop: 10,
      paddingVertical: Device.isAndroid() ? 0 : 10,
      paddingHorizontal: 5,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    searchIcon: {
      marginHorizontal: 8,
      color: colors.icon.alternative,
    },
    input: {
      ...fontStyles.normal,
      color: colors.text.default,
      flex: 1,
    },
    headerDescription: {
      paddingHorizontal: 24,
    },
    resultsView: {
      marginTop: 0,
      flex: 1,
    },
    emptyList: {
      marginVertical: 10,
      marginHorizontal: 30,
    },
    listItem: {
      paddingHorizontal: 24,
      paddingVertical: 24,
    },
    separator: {
      height: 1,
      width: '100%',
      backgroundColor: colors.border.muted,
    },
  });

const Separator = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <View style={styles.separator} />;
};

interface Props {
  isVisible: boolean;
  dismiss: () => void;
  title?: string;
  description?: string;
  currencies?: FiatCurrency[] | null;
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
  const styles = createStyles(colors);
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
      <TouchableOpacity onPress={() => onItemPress(item)}>
        <ListItem style={styles.listItem}>
          <ListItem.Content>
            <ListItem.Body>
              <ListItem.Title>{item.name}</ListItem.Title>
              <Text grey>{item.symbol}</Text>
            </ListItem.Body>
          </ListItem.Content>
        </ListItem>
      </TouchableOpacity>
    ),
    [onItemPress, styles.listItem],
  );

  const handleSearchPress = () => searchInput?.current?.focus();

  const renderEmptyList = useMemo(
    () => (
      <View style={styles.emptyList}>
        <Text>
          {strings('fiat_on_ramp_aggregator.no_currency_match', {
            searchString,
          })}
        </Text>
      </View>
    ),
    [searchString, styles.emptyList],
  );

  const handleSearchTextChange = useCallback((text) => {
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
                <Icon name="ios-search" size={20} style={styles.searchIcon} />
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
                      name="ios-close-circle"
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
