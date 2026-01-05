import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  TouchableWithoutFeedback,
  View,
  Text,
  SectionList,
  SectionListRenderItem,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import dappUrlList from '../../../util/dapp-url-list';
import Fuse from 'fuse.js';
import { useSelector } from 'react-redux';
import styleSheet from './styles';
import { useStyles } from '../../../component-library/hooks';
import {
  UrlAutocompleteComponentProps,
  FuseSearchResult,
  AutocompleteSearchResult,
  UrlAutocompleteRef,
  UrlAutocompleteCategory,
} from './types';
import { debounce } from 'lodash';
import { strings } from '../../../../locales/i18n';
import {
  selectBrowserBookmarksWithType,
  selectBrowserHistoryWithType,
} from '../../../selectors/browser';
import { MAX_RECENTS, ORDERED_CATEGORIES } from './UrlAutocomplete.constants';
import { Result } from './Result';
import Engine from '../../../core/Engine';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';

export * from './types';

const dappsWithType: FuseSearchResult[] = dappUrlList.map(
  (i) => ({ ...i, category: UrlAutocompleteCategory.Sites }) as const,
);
interface ResultsWithCategory {
  category: UrlAutocompleteCategory;
  data: AutocompleteSearchResult[];
}

/**
 * Autocomplete list that appears when the browser url bar is focused
 */
const UrlAutocomplete = React.memo(
  forwardRef<UrlAutocompleteRef, UrlAutocompleteComponentProps>(
    ({ onSelect, onDismiss }, ref) => {
      const browserHistory = useSelector(selectBrowserHistoryWithType);
      const bookmarks = useSelector(selectBrowserBookmarksWithType);
      const initialFuseResults = useMemo(
        () => [...browserHistory, ...bookmarks],
        [browserHistory, bookmarks],
      );
      const [fuseResults, setFuseResults] =
        useState<FuseSearchResult[]>(initialFuseResults);

      const hasResults = fuseResults.length > 0;

      const currentCurrency = useSelector(selectCurrentCurrency);

      useEffect(() => {
        if (currentCurrency) {
          Engine.context.CurrencyRateController.updateExchangeRate([
            currentCurrency,
          ]);
        }
      }, [currentCurrency]);

      const resultsByCategory: ResultsWithCategory[] = useMemo(
        () =>
          ORDERED_CATEGORIES.flatMap((category) => {
            let data = fuseResults.filter(
              (result, index, self) =>
                result.category === category &&
                index ===
                  self.findIndex(
                    (r) => r.url === result.url && r.category === result.category,
                  ),
            );
            if (data.length === 0) {
              return [];
            }
            if (category === UrlAutocompleteCategory.Recents) {
              data = data.slice(0, MAX_RECENTS);
            }
            return {
              category,
              data,
            };
          }),
        [fuseResults],
      );

      const fuseRef = useRef<Fuse<FuseSearchResult> | null>(null);
      const resultsRef = useRef<View | null>(null);
      const { styles } = useStyles(styleSheet, {});

      /**
       * Show the results view
       */
      const show = () => {
        resultsRef.current?.setNativeProps({ style: { display: 'flex' } });
      };

      /**
       * Reset the autocomplete results
       */
      const reset = useCallback(() => {
        setFuseResults(initialFuseResults);
      }, [initialFuseResults]);

      const latestSearchTerm = useRef<string | null>(null);
      const search = useCallback(
        (text: string) => {
          latestSearchTerm.current = text;
          if (!text) {
            reset();
            return;
          }
          const fuseSearchResult = fuseRef.current?.search(text);
          if (Array.isArray(fuseSearchResult)) {
            setFuseResults(fuseSearchResult);
          } else {
            setFuseResults([]);
          }
        },
        [reset],
      );

      /**
       * Debounce the search function
       */
      const debouncedSearch = useMemo(() => debounce(search, 100), [search]);

      /**
       * Hide the results view
       */
      const hide = useCallback(() => {
        // Cancel the search
        debouncedSearch.cancel();
        reset();
        resultsRef.current?.setNativeProps({ style: { display: 'none' } });
      }, [debouncedSearch, reset]);

      const dismissAutocomplete = useCallback(() => {
        hide();
        // Call the onDismiss callback
        onDismiss();
      }, [hide, onDismiss]);

      useImperativeHandle(ref, () => ({
        search: debouncedSearch,
        hide,
        show,
      }));

      useEffect(() => {
        const allUrls: FuseSearchResult[] = [
          ...dappsWithType,
          ...browserHistory,
          ...bookmarks,
        ];

        // Create the fuse search
        fuseRef.current = new Fuse(allUrls, {
          shouldSort: true,
          threshold: 0.4,
          location: 0,
          distance: 100,
          maxPatternLength: 32,
          minMatchCharLength: 1,
          keys: [
            { name: 'name', weight: 0.5 },
            { name: 'url', weight: 0.5 },
          ],
        });

        if (latestSearchTerm.current !== null) {
          search(latestSearchTerm.current);
        }
      }, [browserHistory, bookmarks, search]);

      const renderSectionHeader = useCallback(
        ({ section: { category } }: { section: ResultsWithCategory }) => (
          <View style={styles.categoryWrapper}>
            <Text style={styles.category}>
              {strings(`autocomplete.${category}`)}
            </Text>
          </View>
        ),
        [styles],
      );

      const renderItem: SectionListRenderItem<AutocompleteSearchResult> =
        useCallback(
          ({ item }) => (
            <Result
              result={item}
              onPress={() => {
                hide();
                onSelect(item);
              }}
            />
          ),
          [hide, onSelect],
        );

      if (!hasResults) {
        return (
          <View ref={resultsRef} style={styles.wrapper}>
            <TouchableWithoutFeedback
              style={styles.bg}
              onPress={dismissAutocomplete}
            >
              <View style={styles.bg} />
            </TouchableWithoutFeedback>
          </View>
        );
      }

      return (
        <View ref={resultsRef} style={styles.wrapper}>
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={100}
          >
            <SectionList<AutocompleteSearchResult, ResultsWithCategory>
              contentContainerStyle={styles.contentContainer}
              sections={resultsByCategory}
              keyExtractor={(item) => `${item.category}-${item.url}`}
              renderSectionHeader={renderSectionHeader}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
            />
          </KeyboardAvoidingView>
        </View>
      );
    },
  ),
);

UrlAutocomplete.displayName = 'UrlAutocomplete';

export default UrlAutocomplete;
