import React, { PureComponent } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import { strings } from '../../../../../locales/i18n';
import HeaderCenter from '../../../../component-library/components-temp/HeaderCenter';
import { connect } from 'react-redux';
import AddressList from '../../confirmations/legacy/components/AddressList';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import Engine from '../../../../core/Engine';
import ActionSheet from '@metamask/react-native-actionsheet';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import { selectChainId } from '../../../../selectors/networkController';
import Routes from '../../../../../app/constants/navigation/Routes';

import { ContactsViewSelectorIDs } from './ContactsView.testIds';
import { selectAddressBook } from '../../../../selectors/addressBookController';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      marginTop: 16,
    },
    addContact: {
      paddingHorizontal: 16,
      marginTop: 24,
      marginBottom: Platform.OS === 'ios' ? 16 : 0,
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
     * The chain ID for the current selected network
     */
    chainId: PropTypes.string,
  };

  state = {
    reloadAddressList: false,
  };

  actionSheet;
  contactAddressToRemove;

  updateNavBar = () => {
    const { navigation } = this.props;
    navigation.setOptions({ headerShown: false });
  };

  componentDidMount = () => {
    this.updateNavBar();
  };

  componentDidUpdate = (prevProps) => {
    this.updateNavBar();
    const { chainId } = this.props;
    if (
      prevProps.addressBook &&
      this.props.addressBook &&
      JSON.stringify(prevProps.addressBook[chainId]) !==
        JSON.stringify(this.props.addressBook[chainId])
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
    const { chainId } = this.props;
    AddressBookController.delete(chainId, this.contactAddressToRemove);
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

  onIconPress = () => {
    const { navigation } = this.props;
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.AMBIGUOUS_ADDRESS,
    });
  };

  render = () => {
    const { reloadAddressList } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance;
    const styles = createStyles(colors);
    const { chainId } = this.props;

    return (
      <SafeAreaView
        style={styles.wrapper}
        testID={ContactsViewSelectorIDs.CONTAINER}
        edges={{ bottom: 'additive' }}
      >
        <HeaderCenter
          title={strings('app_settings.contacts_title')}
          onBack={() => this.props.navigation.goBack()}
          includesTopInset
        />
        <AddressList
          chainId={chainId}
          onlyRenderAddressBook
          reloadAddressList={reloadAddressList}
          onAccountPress={this.onAddressPress}
          onIconPress={this.onIconPress}
          onAccountLongPress={this.onAddressLongPress}
        />
        <View style={styles.addContact}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={this.goToAddContact}
            testID={ContactsViewSelectorIDs.ADD_BUTTON}
          >
            {strings('address_book.add_contact')}
          </Button>
        </View>
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
  addressBook: selectAddressBook(state),
  chainId: selectChainId(state),
});

export default connect(mapStateToProps)(Contacts);
