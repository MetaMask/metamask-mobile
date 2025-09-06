import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
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
import { strings } from '../../../../../../locales/i18n';
import ScreenLayout from './ScreenLayout';
import ModalDragger from '../../../../Base/ModalDragger';
import TokenIcon from '../../../Swaps/components/TokenIcon';
import { useTheme } from '../../../../../util/theme';
import { CryptoCurrency } from '@consensys/on-ramp-sdk';
import { Colors } from '../../../../../util/theme/models';
import createModalStyles from './modals/Modal.styles';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { selectTokenSelectors } from '../../../../../../e2e/selectors/Ramps/SelectToken.selectors';

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
      <TouchableOpacity
        accessibilityRole="button"
        accessible
        onPress={() => onItemPress(item)}
      >
        <ListItem style={styles.listItem}>
          <ListItemColumn>
            <TokenIcon medium icon={item.logo} symbol={item.symbol} />
          </ListItemColumn>

          <ListItemColumn widthType={WidthType.Fill}>
            <Text variant={TextVariant.BodyLGMedium}>{item.symbol}</Text>
            {Boolean(item.name) && (
              <Text
                variant={TextVariant.BodyLGMedium}
                color={TextColor.Alternative}
              >
                {item.name}
              </Text>
            )}
          </ListItemColumn>

          <ListItemColumn>
            <View style={styles.networkLabel}>
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {item.network.shortName}
              </Text>
            </View>
          </ListItemColumn>
        </ListItem>
      </TouchableOpacity>
    ),
    [onItemPress, styles.listItem, styles.networkLabel],
  );

  const handleSearchPress = () => searchInput?.current?.focus();

  const renderEmptyList = useMemo(
    () => (
      <View style={modalStyles.emptyList}>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('fiat_on_ramp_aggregator.no_tokens_match', { searchString })}
        </Text>
      </View>
    ),
    [searchString, modalStyles.emptyList],
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
                <Icon name="search" size={20} style={modalStyles.searchIcon} />
                <TextInput
                  ref={searchInput}
                  style={modalStyles.input}
                  placeholder={strings(
                    'fiat_on_ramp_aggregator.search_by_cryptocurrency',
                  )}
                  placeholderTextColor={colors.text.muted}
                  value={searchString}
                  onChangeText={handleSearchTextChange}
                  testID={selectTokenSelectors.TOKEN_SELECT_MODAL_SEARCH_INPUT}
                />
                {searchString.length > 0 && (
                  <TouchableOpacity onPress={handleClearSearch}>
                    <Icon
                      name="close-circle"
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
