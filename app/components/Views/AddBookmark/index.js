import React, { PureComponent } from 'react';
import {
  SafeAreaView,
  Text,
  TextInput,
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';
import { strings } from '../../../../locales/i18n';
import { fontStyles } from '../../../styles/common';
import ActionView from '../../UI/ActionView';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { ThemeContext, mockTheme } from '../../../util/theme';

import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  FAVORITE_TITLE_EDIT_TEXT,
  ADD_BOOKMARKS_SCREEN_ID,
  FAVORITE_URL_EDIT_TEXT,
} from '../../../../wdio/screen-objects/testIDs/BrowserScreen/AddFavorite.testIds';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    rowWrapper: {
      padding: 20,
    },
    textInput: {
      borderWidth: 1,
      borderRadius: 4,
      borderColor: colors.border.default,
      padding: 16,
      ...fontStyles.normal,
      color: colors.text.default,
    },
    warningText: {
      color: colors.error.default,
      ...fontStyles.normal,
    },
    inputTitle: {
      ...fontStyles.normal,
      color: colors.text.default,
    },
  });

/**
 * Copmonent that provides ability to add a bookmark
 */
export default class AddBookmark extends PureComponent {
  state = {
    title: '',
    url: '',
  };

  static propTypes = {
    /**
    /* navigation object required to push new views
    */
    navigation: PropTypes.object,
    /**
     * Object that represents the current route info like params passed to it
     */
    route: PropTypes.object,
  };

  updateNavBar = () => {
    const { navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;

    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('add_favorite.title'),
        navigation,
        false,
        colors,
      ),
    );
  };

  componentDidMount() {
    this.updateNavBar();
    this.loadInitialValues();
  }

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  loadInitialValues() {
    const { route } = this.props;
    this.setState({
      title: route.params?.title ?? '',
      url: route.params?.url ?? '',
    });
  }

  addBookmark = () => {
    const { title, url } = this.state;
    if (title === '' || url === '') return false;
    this.props.route.params.onAddBookmark({ name: title, url });
    this.props.navigation.pop();
  };

  cancelAddBookmark = () => {
    this.props.navigation.pop();
  };

  onTitleChange = (title) => {
    this.setState({ title });
  };

  onUrlChange = (url) => {
    this.setState({ url });
  };

  urlInput = React.createRef();

  jumpToUrl = () => {
    const { current } = this.urlInput;
    current && current.focus();
  };

  render = () => {
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);

    return (
      <SafeAreaView
        style={styles.wrapper}
        {...generateTestId(Platform, ADD_BOOKMARKS_SCREEN_ID)}
      >
        <ActionView
          cancelTestID={'add-bookmark-cancel-button'}
          confirmTestID={'add-bookmark-confirm-button'}
          cancelText={strings('add_favorite.cancel_button')}
          confirmText={strings('add_favorite.add_button')}
          onCancelPress={this.cancelAddBookmark}
          onConfirmPress={this.addBookmark}
        >
          <View>
            <View style={styles.rowWrapper}>
              <Text style={styles.inputTitle}>
                {strings('add_favorite.title_label')}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder={''}
                placeholderTextColor={colors.text.muted}
                value={this.state.title}
                onChangeText={this.onTitleChange}
                {...generateTestId(Platform, FAVORITE_TITLE_EDIT_TEXT)}
                onSubmitEditing={this.jumpToUrl}
                returnKeyType={'next'}
                keyboardAppearance={themeAppearance}
              />
              <Text style={styles.warningText}>{this.state.warningSymbol}</Text>
            </View>
            <View style={styles.rowWrapper}>
              <Text style={styles.inputTitle}>
                {strings('add_favorite.url_label')}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder={''}
                value={this.state.url}
                onChangeText={this.onUrlChange}
                {...generateTestId(Platform, FAVORITE_URL_EDIT_TEXT)}
                ref={this.urlInput}
                onSubmitEditing={this.addToken}
                returnKeyType={'done'}
                placeholderTextColor={colors.text.muted}
                keyboardAppearance={themeAppearance}
              />
              <Text style={styles.warningText}>
                {this.state.warningDecimals}
              </Text>
            </View>
          </View>
        </ActionView>
      </SafeAreaView>
    );
  };
}

AddBookmark.contextType = ThemeContext;
