import React, { PureComponent } from 'react';
import { SafeAreaView, StyleSheet, Platform } from 'react-native';
import PropTypes from 'prop-types';
import { strings } from '../../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { connect } from 'react-redux';
import AddressList from '../../SendFlow/AddressList';
import StyledButton from '../../../UI/StyledButton';
import Engine from '../../../../core/Engine';
import ActionSheet from 'react-native-actionsheet';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { CONTACTS_CONTAINER_ID } from '../../../../../wdio/screen-objects/testIDs/Screens/Contacts.testids';
const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    addContact: {
      marginHorizontal: 24,
      marginBottom: 16,
    },
  });

const EDIT = 'edit';
const ADD = 'add';

/**
 * View that contains app information
 */
class Contacts extends PureComponent {
  static propTypes = {
    /**
     * Map representing the address book
     */
    addressBook: PropTypes.object,
    /**
    /* navigation object required to push new views
    */
    navigation: PropTypes.object,
    /**
     * Network id
     */
    network: PropTypes.string,
  };

  state = {
    reloadAddressList: false,
  };

  actionSheet;
  contactAddressToRemove;

  updateNavBar = () => {
    const { navigation } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.contacts_title'),
        navigation,
        false,
        colors,
      ),
    );
  };

  componentDidMount = () => {
    this.updateNavBar();
  };

  componentDidUpdate = (prevProps) => {
    this.updateNavBar();
    const { network } = this.props;
    if (
      prevProps.addressBook &&
      this.props.addressBook &&
      JSON.stringify(prevProps.addressBook[network]) !==
        JSON.stringify(this.props.addressBook[network])
    )
      this.updateAddressList();
  };

  updateAddressList = () => {
    this.setState({ reloadAddressList: true });
    setTimeout(() => {
      this.setState({ reloadAddressList: false });
    }, 100);
  };

  onAddressLongPress = (address) => {
    this.contactAddressToRemove = address;
    this.actionSheet && this.actionSheet.show();
  };

  deleteContact = () => {
    const { AddressBookController } = Engine.context;
    const { network } = this.props;
    AddressBookController.delete(network, this.contactAddressToRemove);
    this.updateAddressList();
  };

  onAddressPress = (address) => {
    this.props.navigation.navigate('ContactForm', {
      mode: EDIT,
      editMode: EDIT,
      address,
      onDelete: () => this.updateAddressList(),
    });
  };

  goToAddContact = () => {
    this.props.navigation.navigate('ContactForm', { mode: ADD });
  };

  createActionSheetRef = (ref) => {
    this.actionSheet = ref;
  };

  render = () => {
    const { reloadAddressList } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance;
    const styles = createStyles(colors);

    return (
      <SafeAreaView
        style={styles.wrapper}
        {...generateTestId(Platform, CONTACTS_CONTAINER_ID)}
      >
        <AddressList
          onlyRenderAddressBook
          reloadAddressList={reloadAddressList}
          onAccountPress={this.onAddressPress}
          onAccountLongPress={this.onAddressLongPress}
        />
        <StyledButton
          type={'confirm'}
          containerStyle={styles.addContact}
          onPress={this.goToAddContact}
          testID={'add-contact-button'}
        >
          {strings('address_book.add_contact')}
        </StyledButton>
        <ActionSheet
          ref={this.createActionSheetRef}
          title={strings('address_book.delete_contact')}
          options={[
            strings('address_book.delete'),
            strings('address_book.cancel'),
          ]}
          cancelButtonIndex={1}
          destructiveButtonIndex={0}
          // eslint-disable-next-line react/jsx-no-bind
          onPress={(index) => (index === 0 ? this.deleteContact() : null)}
          theme={themeAppearance}
        />
      </SafeAreaView>
    );
  };
}

Contacts.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  addressBook: state.engine.backgroundState.AddressBookController.addressBook,
  network: state.engine.backgroundState.NetworkController.network,
});

export default connect(mapStateToProps)(Contacts);
