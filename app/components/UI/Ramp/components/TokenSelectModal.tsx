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

import Text from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';
import ModalDragger from '../../../Base/ModalDragger';
import TokenIcon from '../../Swaps/components/TokenIcon';
import { useTheme } from '../../../../util/theme';
import { CryptoCurrency } from '@consensys/on-ramp-sdk';
import { Colors } from '../../../../util/theme/models';
import createModalStyles from './modals/Modal.styles';

// TODO: Convert into typescript and correctly type optionals
const ListItem = BaseListItem as any;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    networkLabel: {
      backgroundColor: colors.background.default,
      borderWidth: 1,
      borderColor: colors.border.default,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    networkLabelText: {
      fontSize: 12,
      color: colors.text.alternative,
    },
    listItem: {
      paddingHorizontal: 24,
    },
  });

const MAX_TOKENS_RESULTS = 20;

interface Props {
  isVisible: boolean;
  dismiss: () => void;
  title?: string;
  description?: string;
  tokens: CryptoCurrency[];
  onItemPress: (token: CryptoCurrency) => void;
  excludeAddresses?: CryptoCurrency['address'][];
}
function TokenSelectModal({
  isVisible,
  dismiss,
  title,
  description,
  tokens,
  onItemPress,
  excludeAddresses = [],
}: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const modalStyles = createModalStyles(colors);
  const searchInput = useRef<TextInput>(null);
  const list = useRef<FlatList<CryptoCurrency>>(null);
  const [searchString, setSearchString] = useState('');

  const excludedAddresses = useMemo(
    () =>
      excludeAddresses.filter(Boolean).map((address) => address.toLowerCase()),
    [excludeAddresses],
  );

  const filteredTokens = useMemo(
    () =>
      tokens?.filter(
        (token) => !excludedAddresses.includes(token.address?.toLowerCase()),
      ),
    [excludedAddresses, tokens],
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
        keys: ['symbol', 'address', 'name'],
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
    ({ item }: { item: CryptoCurrency }) => (
      <TouchableOpacity onPress={() => onItemPress(item)}>
        <ListItem style={styles.listItem}>
          <ListItem.Content>
            <ListItem.Icon>
              <TokenIcon medium icon={item.logo} symbol={item.symbol} />
            </ListItem.Icon>
            <ListItem.Body>
              <ListItem.Title bold>{item.symbol}</ListItem.Title>
              {Boolean(item.name) && <Text grey>{item.name}</Text>}
            </ListItem.Body>
            <ListItem.Amounts>
              <ListItem.Amount>
                <View style={styles.networkLabel}>
                  <Text style={styles.networkLabelText}>
                    {item.network.shortName}
                  </Text>
                </View>
              </ListItem.Amount>
            </ListItem.Amounts>
          </ListItem.Content>
        </ListItem>
      </TouchableOpacity>
    ),
    [
      onItemPress,
      styles.listItem,
      styles.networkLabel,
      styles.networkLabelText,
    ],
  );

  const handleSearchPress = () => searchInput?.current?.focus();

  const renderEmptyList = useMemo(
    () => (
      <View style={modalStyles.emptyList}>
        <Text>
          {strings('fiat_on_ramp_aggregator.no_tokens_match', { searchString })}
        </Text>
      </View>
    ),
    [searchString, modalStyles.emptyList],
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
                  name="ios-search"
                  size={20}
                  style={modalStyles.searchIcon}
                />
                <TextInput
                  ref={searchInput}
                  style={modalStyles.input}
                  placeholder={strings(
                    'fiat_on_ramp_aggregator.search_by_cryptocurrency',
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
                      color={colors.icon.default}
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
                style={modalStyles.resultsView}
                keyboardDismissMode="none"
                keyboardShouldPersistTaps="always"
                data={tokenSearchResults}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmptyList}
              />
            </View>
          </ScreenLayout.Body>
        </ScreenLayout>
      </SafeAreaView>
    </Modal>
  );
}

export default TokenSelectModal;
