import React, { PureComponent } from 'react';
import {
  TouchableWithoutFeedback,
  View,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import PropTypes from 'prop-types';
import dappUrlList from '../../../util/dapp-url-list';
import Fuse from 'fuse.js';
import { connect } from 'react-redux';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { MAX_RECENTS, ORDERED_CATEGORIES } from './UrlAutocomplete.constants';
import { selectBrowserBookmarksWithType, selectBrowserHistoryWithType } from '../../../selectors/browser';
import { createStyles } from './index.styles';
import { ResultCategory } from './ResultCategory';

const dappsWithType = dappUrlList.map(i => ({...i, type: 'sites'}));

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
    this.updateResults([]);
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
    if (this.mounted) {
      if (!this.props.input || this.props.input.length === 0) {
        results = [
          ...this.props.browserHistory,
          ...this.props.bookmarks,
        ]
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

      this.setState({
        resultsByCategory,
        hasResults: results.length > 0,
        categoriesWithResults: ORDERED_CATEGORIES.filter(category => resultsByCategory[category]?.length > 0),
      })
    }
  }

  onSubmitInput = () => this.props.onSubmit(this.props.input);

  render() {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    if (!this.state.hasResults) {
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

    return (
      <ScrollView style={styles.wrapper} contentContainerStyle={styles.contentContainer}>
        {
          this.state.categoriesWithResults.map(category => (
            <ResultCategory
              key={category}
              category={category}
              results={this.state.resultsByCategory[category]}
              onSubmit={this.props.onSubmit}
            />
          )
        )}
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
  browserHistory: selectBrowserHistoryWithType(state),
  bookmarks: selectBrowserBookmarksWithType(state),
});

UrlAutocomplete.contextType = ThemeContext;

export default connect(mapStateToProps)(UrlAutocomplete);
