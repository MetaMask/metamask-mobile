import React, { PureComponent } from 'react';
import {
  TouchableWithoutFeedback,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import PropTypes from 'prop-types';
import dappUrlList from '../../../util/dapp-url-list';
import Fuse from 'fuse.js';
import { connect } from 'react-redux';
import WebsiteIcon from '../WebsiteIcon';
import { fontStyles } from '../../../styles/common';
import { getHost } from '../../../util/browser';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';

const MAX_RECENTS = 5;
const ORDERED_CATEGORIES = ['recents', 'favorites', 'sites'];

const createStyles = (colors) =>
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
    category: {
      fontSize: 16,
      color: colors.text.default,
      ...fontStyles.bold,
      margin: 10,
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
 * PureComponent that renders an autocomplete
 * based on an input string
 */
class UrlAutocomplete extends PureComponent {
  static propTypes = {
    /**
     * input text for the autocomplete
     */
    input: PropTypes.string,
    /**
     * Callback that is triggered while
     * choosing one of the autocomplete options
     */
    onSubmit: PropTypes.func,
    /**
     * Callback that is triggered while
     * tapping on the background
     */
    onDismiss: PropTypes.func,
    /**
     * An array of visited urls and names
     */
    browserHistory: PropTypes.array,
    /**
     * An array of bookmarks
     */
    bookmarks: PropTypes.array,
  };

  state = {
    results: [],
  };

  componentDidMount() {
    const allUrls = dappUrlList;

    this.fuse = new Fuse(allUrls, {
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

    this.timer = null;
    this.mounted = true;
  }

  componentDidUpdate(prevProps) {
    if (prevProps.input !== this.props.input) {
      if (this.timer) {
        clearTimeout(this.timer);
      }

      this.timer = setTimeout(() => {
        const fuseSearchResult = this.fuse.search(this.props.input);
        if (Array.isArray(fuseSearchResult)) {
          this.updateResults([...fuseSearchResult]);
        } else {
          this.updateResults([]);
        }
      }, 50);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  updateResults(results) {
    this.mounted && this.setState({ results });
  }

  onSubmitInput = () => this.props.onSubmit(this.props.input);

  renderUrlOption = (url, name, onPress) => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

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
  };

  render() {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    let results = [];
    if (!this.props.input || this.props.input.length === 0) {
      results = [
        ...this.props.browserHistory.slice(-MAX_RECENTS).reverse().map(i => ({...i, type: 'recents'})),
        ...this.props.bookmarks.map(i => ({...i, type: 'favorites'})),
      ]
    } else {
      results = this.state.results.map(i => ({...i, type: 'sites'}));
    }

    const resultsByCategory = results.reduce((acc, i) => {
      acc[i.type] = [...acc[i.type] || [], i];
      return acc;
    }, {});

    if (results.length === 0) {
      return (
        <View style={styles.wrapper}>
          <TouchableOpacity
            containerStyle={styles.item}
            onPress={this.onSubmitInput}
          >
            <View style={styles.itemWrapper}>
              <View style={styles.textContent}>
                <Text style={styles.name} numberOfLines={1}>
                  {this.props.input}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableWithoutFeedback
            style={styles.bg}
            onPress={this.props.onDismiss}
          >
            <View style={styles.bg} />
          </TouchableWithoutFeedback>
        </View>
      );
    }

    const categoriesWithResults = ORDERED_CATEGORIES.filter(category => resultsByCategory[category]?.length > 0);

    return (
      <View style={styles.wrapper}>
        {
          categoriesWithResults.map(category => {
            return (
              <View key={category}>
                <Text style={styles.category}>{strings(`autocomplete.${category}`)}</Text>
                {resultsByCategory[category].map((r) => {
                  const { url, name } = r;
                  const onPress = () => {
                    this.props.onSubmit(url);
                  };
                  return this.renderUrlOption(url, name, onPress);
                })}
              </View>
            )
          })
        }
        <TouchableWithoutFeedback
          style={styles.bg}
          onPress={this.props.onDismiss}
        >
          <View style={styles.bg} />
        </TouchableWithoutFeedback>
      </View>
    );
  }
}

const mapStateToProps = (state) => ({
  browserHistory: state.browser.history,
  bookmarks: state.bookmarks,
});

UrlAutocomplete.contextType = ThemeContext;

export default connect(mapStateToProps)(UrlAutocomplete);
