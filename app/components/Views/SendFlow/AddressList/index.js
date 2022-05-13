import React, { PureComponent } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { fontStyles } from '../../../../styles/common';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Fuse from 'fuse.js';
import { isSmartContractAddress } from '../../../../util/transactions';
import { strings } from '../../../../../locales/i18n';
import AddressElement from '../AddressElement';
import { ThemeContext, mockTheme } from '../../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    messageText: {
      ...fontStyles.normal,
      color: colors.primary.default,
      fontSize: 16,
      textAlign: 'center',
    },
    messageLeft: {
      textAlign: 'left',
    },
    myAccountsWrapper: {
      flexGrow: 1,
    },
    myAccountsTouchable: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
      padding: 16,
    },
    labelElementWrapper: {
      backgroundColor: colors.background.default,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
      padding: 8,
    },
    labelElementInitialText: {
      textTransform: 'uppercase',
    },
    labelElementText: {
      ...fontStyles.normal,
      fontSize: 12,
      marginHorizontal: 8,
      color: colors.text.alternative,
    },
    activityIndicator: {
      color: colors.icon.default,
    },
  });

const LabelElement = (
  styles,
  label,
  checkingForSmartContracts = false,
  showLoading = false,
) => (
  <View key={label} style={styles.labelElementWrapper}>
    <Text
      style={[
        styles.labelElementText,
        label.length > 1 ? {} : styles.labelElementInitialText,
      ]}
    >
      {label}
    </Text>
    {showLoading && checkingForSmartContracts && (
      <ActivityIndicator size="small" style={styles.activityIndicator} />
    )}
  </View>
);
/**
 * View that wraps the wraps the "Send" screen
 */
class AddressList extends PureComponent {
  static propTypes = {
    /**
     * List of accounts from the PreferencesController
     */
    identities: PropTypes.object,
    /**
     * Map representing the address book
     */
    addressBook: PropTypes.object,
    /**
     * Search input from parent component
     */
    inputSearch: PropTypes.string,
    /**
     * Network id
     */
    network: PropTypes.string,
    /**
     * Callback called when account in address book is pressed
     */
    onAccountPress: PropTypes.func,
    /**
     * Callback called when account in address book is long pressed
     */
    onAccountLongPress: PropTypes.func,
    /**
     * Whether it only has to render address book
     */
    onlyRenderAddressBook: PropTypes.bool,
    reloadAddressList: PropTypes.bool,
    /**
     * An array that represents the user's recent toAddresses
     */
    recents: PropTypes.array,
  };

  state = {
    myAccountsOpened: false,
    processedAddressBookList: undefined,
    contactElements: [],
    checkingForSmartContracts: false,
  };

  networkAddressBook = {};

  componentDidMount = () => {
    const { addressBook, network } = this.props;
    this.networkAddressBook = addressBook[network] || {};
    const networkAddressBookList = Object.keys(this.networkAddressBook).map(
      (address) => this.networkAddressBook[address],
    );
    this.fuse = new Fuse(networkAddressBookList, {
      shouldSort: true,
      threshold: 0.45,
      location: 0,
      distance: 10,
      maxPatternLength: 32,
      minMatchCharLength: 1,
      keys: [
        { name: 'name', weight: 0.5 },
        { name: 'address', weight: 0.5 },
      ],
    });
    this.parseAddressBook(networkAddressBookList);
  };

  componentDidUpdate = (prevProps) => {
    const { network, addressBook, reloadAddressList } = this.props;
    if (
      (prevProps.reloadAddressList &&
        reloadAddressList !== prevProps.reloadAddressList) ||
      prevProps.inputSearch !== this.props.inputSearch ||
      JSON.stringify(prevProps.addressBook[network]) !==
        JSON.stringify(addressBook[network])
    ) {
      let networkAddressBookList;
      if (this.props.inputSearch) {
        networkAddressBookList = this.fuse.search(this.props.inputSearch);
      } else {
        const { addressBook } = this.props;
        const networkAddressBook = addressBook[network] || {};
        networkAddressBookList = Object.keys(networkAddressBook).map(
          (address) => networkAddressBook[address],
        );
      }
      this.parseAddressBook(networkAddressBookList);
    }
  };

  openMyAccounts = () => {
    this.setState({ myAccountsOpened: true });
  };

  parseAddressBook = (networkAddressBookList) => {
    const contactElements = [];
    const addressBookTree = {};
    networkAddressBookList.forEach((contact) => {
      this.setState({ checkingForSmartContracts: true });

      isSmartContractAddress(contact.address, contact.chainId)
        .then((isSmartContract) => {
          if (isSmartContract) {
            contact.isSmartContract = true;
            return this.setState({ checkingForSmartContracts: false });
          }

          contact.isSmartContract = false;
          return this.setState({ checkingForSmartContracts: false });
        })
        .catch(() => {
          contact.isSmartContract = false;
        });
    });

    networkAddressBookList.forEach((contact) => {
      const contactNameInitial = contact && contact.name && contact.name[0];
      const nameInitial =
        contactNameInitial && contactNameInitial.match(/[a-z]/i);
      const initial = nameInitial
        ? nameInitial[0]
        : strings('address_book.others');
      if (Object.keys(addressBookTree).includes(initial)) {
        addressBookTree[initial].push(contact);
      } else if (contact.isSmartContract && !this.props.onlyRenderAddressBook) {
        null;
      } else {
        addressBookTree[initial] = [contact];
      }
    });
    Object.keys(addressBookTree)
      .sort()
      .forEach((initial) => {
        contactElements.push(initial);
        addressBookTree[initial].forEach((contact) => {
          contactElements.push(contact);
        });
      });
    this.setState({ contactElements });
  };

  renderMyAccounts = () => {
    const { identities, onAccountPress, inputSearch, onAccountLongPress } =
      this.props;
    const { myAccountsOpened } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    if (inputSearch) return;
    return !myAccountsOpened ? (
      <TouchableOpacity
        style={styles.myAccountsTouchable}
        onPress={this.openMyAccounts}
        testID={'my-accounts-button'}
      >
        <Text style={[styles.messageText, styles.messageLeft]}>
          {strings('address_book.between_account')}
        </Text>
      </TouchableOpacity>
    ) : (
      <View>
        {Object.keys(identities).map((address) => (
          <AddressElement
            key={address}
            address={address}
            name={identities[address].name}
            onAccountPress={onAccountPress}
            onAccountLongPress={onAccountLongPress}
            testID={'account-identity'}
          />
        ))}
      </View>
    );
  };

  renderElement = (element) => {
    const { onAccountPress, onAccountLongPress } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    if (typeof element === 'string') {
      return LabelElement(styles, element);
    }

    const key = element.address + element.name;

    return (
      <AddressElement
        key={key}
        address={element.address}
        name={element.name}
        onAccountPress={onAccountPress}
        onAccountLongPress={onAccountLongPress}
        testID={'account-address'}
      />
    );
  };

  renderRecents = () => {
    const {
      recents,
      identities,
      addressBook,
      network,
      onAccountPress,
      onAccountLongPress,
      inputSearch,
    } = this.props;
    const networkAddressBook = addressBook[network] || {};
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    const addressName = (address) =>
      Object.values(networkAddressBook).find(
        (addressBook) =>
          addressBook.address.toLowerCase() === address.toLowerCase(),
      )?.name ||
      Object.values(identities).find(
        (addressBook) =>
          addressBook.address.toLowerCase() === address.toLowerCase(),
      )?.name;

    if (!recents.length || inputSearch) return;

    return (
      <>
        {LabelElement(
          styles,
          strings('address_book.recents'),
          this.state.checkingForSmartContracts,
          true,
        )}
        {recents
          .filter((recent) => recent != null)
          .map((address, index) => (
            <AddressElement
              key={index}
              address={address}
              name={addressName(address)}
              onAccountPress={onAccountPress}
              onAccountLongPress={onAccountLongPress}
            />
          ))}
      </>
    );
  };

  render = () => {
    const { contactElements } = this.state;
    const { onlyRenderAddressBook } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    const sendFlowContacts = [];

    contactElements.filter((element) => {
      if (typeof element === 'object' && element.isSmartContract === false) {
        const nameInitial = element && element.name && element.name[0];
        if (sendFlowContacts.includes(nameInitial)) {
          sendFlowContacts.push(element);
        } else {
          sendFlowContacts.push(nameInitial);
          sendFlowContacts.push(element);
        }
      }
      return element;
    });

    return (
      <View style={styles.root}>
        <ScrollView style={styles.myAccountsWrapper}>
          {!onlyRenderAddressBook && this.renderMyAccounts()}
          {!onlyRenderAddressBook && this.renderRecents()}
          {!onlyRenderAddressBook
            ? sendFlowContacts.map(this.renderElement)
            : contactElements.map(this.renderElement)}
        </ScrollView>
      </View>
    );
  };
}

AddressList.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  recents: state.recents,
  addressBook: state.engine.backgroundState.AddressBookController.addressBook,
  identities: state.engine.backgroundState.PreferencesController.identities,
  network: state.engine.backgroundState.NetworkController.network,
  transactions: state.engine.backgroundState.TransactionController.transactions,
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
});

export default connect(mapStateToProps)(AddressList);
