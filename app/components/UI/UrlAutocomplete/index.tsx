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
} from 'react-native';
import dappUrlList from '../../../util/dapp-url-list';
import Fuse from 'fuse.js';
import { useSelector } from 'react-redux';
import styleSheet from './styles';
import { useStyles } from '../../../component-library/hooks';
import {
  UrlAutocompleteComponentProps,
  FuseSearchResult,
  UrlAutocompleteRef,
} from './types';
import { debounce } from 'lodash';
import { strings } from '../../../../locales/i18n';
import { selectBrowserBookmarksWithType, selectBrowserHistoryWithType } from '../../../selectors/browser';
import { MAX_RECENTS, ORDERED_CATEGORIES } from './UrlAutocomplete.constants';
import { Result } from './Result';

export * from './types';

const dappsWithType = dappUrlList.map(i => ({...i, type: 'sites'}));

/**
 * Autocomplete list that appears when the browser url bar is focused
 */
const UrlAutocomplete = forwardRef<
  UrlAutocompleteRef,
  UrlAutocompleteComponentProps
>(({ onSelect, onDismiss }, ref) => {
  const [resultsByCategory, setResultsByCategory] = useState<{category: string, data: FuseSearchResult[]}[]>([]);
  const hasResults = resultsByCategory.length > 0;

  const browserHistory = useSelector(selectBrowserHistoryWithType);
  const bookmarks = useSelector(selectBrowserBookmarksWithType);
  const fuseRef = useRef<Fuse<FuseSearchResult> | null>(null);
  const resultsRef = useRef<View | null>(null);
  const { styles } = useStyles(styleSheet, {});

  /**
   * Show the results view
   */
  const show = () => {
    resultsRef.current?.setNativeProps({ style: { display: 'flex' } });
  };

  const updateResults = useCallback((results: FuseSearchResult[]) => {
    const newResultsByCategory = ORDERED_CATEGORIES.flatMap((category) => {
      let data = results.filter((result, index, self) =>
        result.type === category &&
        index === self.findIndex(r => r.url === result.url && r.type === result.type)
      );
      if (data.length === 0) {
        return [];
      }
      if (category === 'recents') {
        data = data.slice(0, MAX_RECENTS);
      }
      return {
        category,
        data,
      };
    });

    setResultsByCategory(newResultsByCategory);
  }, []);

  const latestSearchTerm = useRef<string | null>(null);
  const search = useCallback((text: string) => {
    latestSearchTerm.current = text;
    if (!text) {
      updateResults([
        ...browserHistory,
        ...bookmarks,
      ]);
      return;
    }
    const fuseSearchResult = fuseRef.current?.search(text);
    if (Array.isArray(fuseSearchResult)) {
      updateResults([...fuseSearchResult]);
    } else {
      updateResults([]);
    }
  }, [updateResults, browserHistory, bookmarks]);

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
    resultsRef.current?.setNativeProps({ style: { display: 'none' } });
    setResultsByCategory([]);
  }, [debouncedSearch]);

  const dismissAutocomplete = () => {
    hide();
    // Call the onDismiss callback
    onDismiss();
  };

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

  const renderSectionHeader = useCallback(({section: {category}}) => (
    <Text style={styles.category}>{strings(`autocomplete.${category}`)}</Text>
  ), [styles]);

  const renderItem = useCallback(({item}) => (
    <Result
      result={item}
      onPress={() => {
        hide();
        onSelect(item.url);
      }}
    />
  ), [hide, onSelect]);

  if (!hasResults) {
    return (
      <View ref={resultsRef} style={styles.wrapper}>
        <TouchableWithoutFeedback style={styles.bg} onPress={dismissAutocomplete}>
          <View style={styles.bg} />
        </TouchableWithoutFeedback>
      </View>
    );
  }

  return (
    <View ref={resultsRef} style={styles.wrapper}>
      <SectionList
        contentContainerStyle={styles.contentContainer}
        sections={resultsByCategory}
        keyExtractor={(item) => `${item.type}-${item.url}`}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
    />
    </View>
  );
});

export default UrlAutocomplete;
