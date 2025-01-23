import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  TouchableWithoutFeedback,
  View,
  TouchableOpacity,
  Text,
} from 'react-native';
import dappUrlList from '../../../util/dapp-url-list';
import Fuse from 'fuse.js';
import { useSelector } from 'react-redux';
import WebsiteIcon from '../WebsiteIcon';
import { getHost } from '../../../util/browser';
import styleSheet from './styles';
import { useStyles } from '../../../component-library/hooks';
import {
  UrlAutocompleteComponentProps,
  FuseSearchResult,
  UrlAutocompleteRef,
} from './types';
import { selectBrowserHistory } from '../../../reducers/browser/selectors';
import { debounce } from 'lodash';

export * from './types';

/**
 * Autocomplete list that appears when the browser url bar is focused
 */
const UrlAutocomplete = forwardRef<
  UrlAutocompleteRef,
  UrlAutocompleteComponentProps
>(({ onSelect, onDismiss }, ref) => {
  const [results, setResults] = useState<FuseSearchResult[]>([]);
  // TODO: Browser history hasn't been working for a while. Need to either fix or remove.
  const browserHistory = useSelector(selectBrowserHistory);
  const fuseRef = useRef<Fuse<FuseSearchResult> | null>(null);
  const resultsRef = useRef<View | null>(null);
  const { styles } = useStyles(styleSheet, {});

  /**
   * Show the results view
   */
  const show = () => {
    resultsRef.current?.setNativeProps({ style: { display: 'flex' } });
  };

  const search = (text: string) => {
    const fuseSearchResult = fuseRef.current?.search(text);
    if (Array.isArray(fuseSearchResult)) {
      setResults([...fuseSearchResult]);
    } else {
      setResults([]);
    }
  };

  /**
   * Debounce the search function
   */
  const debouncedSearchRef = useRef(debounce(search, 500));

  /**
   * Hide the results view
   */
  const hide = useCallback(() => {
    // Cancel the search
    debouncedSearchRef.current.cancel();
    resultsRef.current?.setNativeProps({ style: { display: 'none' } });
    setResults([]);
  }, [setResults]);

  const dismissAutocomplete = () => {
    hide();
    // Call the onDismiss callback
    onDismiss();
  };

  useImperativeHandle(ref, () => ({
    search: debouncedSearchRef.current,
    hide,
    show,
  }));

  useEffect(() => {
    const allUrls: FuseSearchResult[] = [browserHistory, ...dappUrlList];
    const singleUrlList: string[] = [];
    const singleUrls: FuseSearchResult[] = [];
    for (const el of allUrls) {
      if (!singleUrlList.includes(el.url)) {
        singleUrlList.push(el.url);
        singleUrls.push(el);
      }
    }

    // Create the fuse search
    fuseRef.current = new Fuse(singleUrls, {
      shouldSort: true,
      threshold: 0.45,
      location: 0,
      distance: 100,
      maxPatternLength: 32,
      minMatchCharLength: 1,
      keys: [
        { name: 'name', weight: 0.5 },
        { name: 'url', weight: 0.5 },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderResult = useCallback(
    (url: string, name: string, onPress: () => void) => {
      name = typeof name === 'string' ? name : getHost(url);

      return (
        <TouchableOpacity style={styles.item} onPress={onPress} key={url}>
          <View style={styles.itemWrapper}>
            <WebsiteIcon
              style={styles.bookmarkIco}
              url={url}
              title={name}
              textStyle={styles.fallbackTextStyle}
            />
            <View style={styles.textContent}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.url} numberOfLines={1}>
                {url}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [styles],
  );

  const renderResults = useCallback(
    () =>
      results.slice(0, 3).map((result) => {
        const { url, name } = result;
        const onPress = () => {
          hide();
          onSelect(url);
        };
        return renderResult(url, name, onPress);
      }),
    [results, onSelect, hide, renderResult],
  );

  return (
    <View ref={resultsRef} style={styles.wrapper}>
      {renderResults()}
      <TouchableWithoutFeedback style={styles.bg} onPress={dismissAutocomplete}>
        <View style={styles.bg} />
      </TouchableWithoutFeedback>
    </View>
  );
});

export default UrlAutocomplete;
