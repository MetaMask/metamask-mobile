import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  TouchableWithoutFeedback,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import dappUrlList from '../../../util/dapp-url-list';
import Fuse from 'fuse.js';
import { useSelector, useDispatch } from 'react-redux';
import WebsiteIcon from '../WebsiteIcon';
import { fontStyles } from '../../../styles/common';
import { getHost } from '../../../util/browser';
import { ThemeContext, mockTheme } from '../../../util/theme';

interface UrlOption {
  name: string;
  url: string;
}

interface UrlAutocompleteProps {
  input: string;
  onSubmit: (url: string) => void;
  onDismiss: () => void;
  browserHistory: UrlOption[];
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      paddingVertical: 15,
      flex: 1,
      backgroundColor: colors.background.default,
    },
    bookmarkIco: {
      width: 26,
      height: 26,
      marginRight: 7,
      borderRadius: 13,
    },
    fallbackTextStyle: {
      fontSize: 12,
    },
    name: {
      fontSize: 14,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    url: {
      fontSize: 12,
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
    item: {
      flex: 1,
      marginBottom: 20,
    },
    itemWrapper: {
      flexDirection: 'row',
      marginBottom: 20,
      paddingHorizontal: 15,
    },
    textContent: {
      flex: 1,
      marginLeft: 10,
    },
    bg: {
      flex: 1,
    },
  });

/**
 * Functional component that renders an autocomplete
 * based on an input string
 */
const UrlAutocomplete: React.FC<UrlAutocompleteProps> = ({ input, onSubmit, onDismiss, browserHistory }) => {
  const [results, setResults] = useState<UrlOption[]>([]);
  const colors = useContext(ThemeContext).colors || mockTheme.colors;
  const styles = createStyles(colors);
  const fuseRef = useRef<Fuse<UrlOption>>();

  useEffect(() => {
    const allUrls = [...browserHistory, ...dappUrlList];
    const singleUrlList: string[] = [];
    const singleUrls: UrlOption[] = [];

    for (let i = 0; i < allUrls.length; i++) {
      const el = allUrls[i];
      if (!singleUrlList.includes(el.url)) {
        singleUrlList.push(el.url);
        singleUrls.push(el);
      }
    }

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
  }, [browserHistory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (fuseRef.current && input && input.length >= 2) {
        const fuseSearchResult = fuseRef.current.search(input);
        if (Array.isArray(fuseSearchResult)) {
          setResults([...fuseSearchResult]);
        } else {
          setResults([]);
        }
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [input]);

  const onSubmitInput = useCallback(() => onSubmit(input), [input, onSubmit]);

  const renderUrlOption = useCallback((url: string, name: string, onPress: () => void) => {
    name = typeof name === 'string' ? name : getHost(url);
    return (
      <TouchableOpacity
        containerStyle={styles.item}
        onPress={onPress}
        key={url}
      >
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
  }, [styles]);

  if (!input || input.length < 2)
    return (
      <View style={styles.wrapper}>
        <TouchableWithoutFeedback
          style={styles.bg}
          onPress={onDismiss}
        >
          <View style={styles.bg} />
        </TouchableWithoutFeedback>
      </View>
    );
  if (results.length === 0) {
    return (
      <View style={styles.wrapper}>
        <TouchableOpacity
          containerStyle={styles.item}
          onPress={onSubmitInput}
        >
          <View style={styles.itemWrapper}>
            <View style={styles.textContent}>
              <Text style={styles.name} numberOfLines={1}>
                {input}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableWithoutFeedback
          style={styles.bg}
          onPress={onDismiss}
        >
          <View style={styles.bg} />
        </TouchableWithoutFeedback>
      </View>
    );
  }
  return (
    <View style={styles.wrapper}>
      {results.slice(0, 3).map((r) => {
        const { url, name } = r;
        const onPress = () => {
          onSubmit(url);
        };
        return renderUrlOption(url, name, onPress);
      })}
      <TouchableWithoutFeedback
        style={styles.bg}
        onPress={onDismiss}
      >
        <View style={styles.bg} />
      </TouchableWithoutFeedback>
    </View>
  );
};

const mapStateToProps = (state: RootState) => ({
  browserHistory: state.browser.history,
});

export default connect(mapStateToProps)(UrlAutocomplete);
