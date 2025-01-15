import React, { PureComponent } from 'react';
import {
  TouchableWithoutFeedback,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
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
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { removeBookmark } from '../../../actions/bookmarks';

const MAX_RECENTS = 5;
const ORDERED_CATEGORIES = ['sites', 'recents', 'favorites'];

export const deleteFavoriteTestId = (url) => `delete-favorite-${url}`;

const dappsWithType = dappUrlList.map(i => ({...i, type: 'sites'}));

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    contentContainer: {
      paddingVertical: 15,
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
    deleteFavorite: {
      marginLeft: 10,
    },
  });

/**
 * PureComponent that renders an autocomplete
 * based on an input string
 */
export class UrlAutocomplete extends PureComponent {
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
    /**
     * Function to remove a bookmark
     */
    removeBookmark: PropTypes.func,
  };

  state = {
    results: [],
  };

  componentDidMount() {
    this.createSearchIndex();
    this.mounted = true;
  }

  createSearchIndex = () => {
    const allUrls = [
      ...dappsWithType,
      ...this.props.browserHistory,
      ...this.props.bookmarks,
    ];
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
  }

  componentDidUpdate(prevProps) {
    if (prevProps.input !== this.props.input) {
      this.processInput();
    } else if (prevProps.bookmarks.length !== this.props.bookmarks.length) {
      this.createSearchIndex();
      this.processInput();
    }
  }

  processInput = () => {
    const fuseSearchResult = this.fuse.search(this.props.input);
    if (Array.isArray(fuseSearchResult)) {
      this.updateResults([...fuseSearchResult]);
    } else {
      this.updateResults([]);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  updateResults(results) {
    this.mounted && this.setState({ results });
  }

  onSubmitInput = () => this.props.onSubmit(this.props.input);

  removeBookmark = (bookmark) => {
    this.props.removeBookmark(bookmark);
  }

  renderUrlOption = ({url, name, type}, onPress) => {
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
          {
            type === 'favorites' && (
              <ButtonIcon
                testID={deleteFavoriteTestId(url)}
                style={styles.deleteFavorite}              
                iconName={IconName.Trash}
                onPress={() => this.removeBookmark({url, name})}
              />
            )
          }
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
        ...this.props.browserHistory.reverse(),
        ...this.props.bookmarks,
      ]
    } else {
      results = this.state.results;
    }

    const resultsByCategory = results.reduce((acc, currentResult) => {
      acc[currentResult.type] = acc[currentResult.type] || [];
      if (
        (currentResult.type !== 'recents' || (acc.recents.length  < MAX_RECENTS)) &&
        !acc[currentResult.type].find(result => result.url === currentResult.url)
       ) {
        acc[currentResult.type] = [...acc[currentResult.type], currentResult];
      }
      return acc;
    }, {});

    if (results.length === 0) {
      return (
        <View style={{...styles.wrapper, ...styles.contentContainer}}>
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
      <ScrollView style={styles.wrapper} contentContainerStyle={styles.contentContainer}>
        {
          categoriesWithResults.map(category => (
              <View key={category}>
                <Text style={styles.category}>{strings(`autocomplete.${category}`)}</Text>
                {resultsByCategory[category].map((result) => {
                  const onPress = () => {
                    this.props.onSubmit(result.url);
                  };
                  return this.renderUrlOption(result, onPress);
                })}
              </View>
            )
          )
        }
        <TouchableWithoutFeedback
          style={styles.bg}
          onPress={this.props.onDismiss}
        >
          <View style={styles.bg} />
        </TouchableWithoutFeedback>
      </ScrollView>
    );
  }
}

const mapStateToProps = (state) => ({
  browserHistory: state.browser.history.map(i => ({...i, type: 'recents'})),
  bookmarks: state.bookmarks.map(i => ({...i, type: 'favorites'})),
});

const mapDispatchToProps = (dispatch) => ({
  removeBookmark: (bookmark) => dispatch(removeBookmark(bookmark)),
});

UrlAutocomplete.contextType = ThemeContext;

export default connect(mapStateToProps, mapDispatchToProps)(UrlAutocomplete);
