import React, { PureComponent } from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import { strings } from '../../../../../locales/i18n';
import { connect } from 'react-redux';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import AddressList from '../../confirmations/legacy/components/AddressList';
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
    },
    content: {
      flex: 1,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingBottom: 88,
      gap: 16,
    },
    emptyStateCopy: {
      gap: 8,
      alignItems: 'center',
    },
    emptyStateDescription: {
      textAlign: 'center',
    },
    emptyStateButton: {
      width: '100%',
      marginTop: 8,
    },
    footer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      paddingTop: 12,
    },
    addContact: {
      width: '100%',
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

  componentDidUpdate = (prevProps) => {
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

  hasContacts = () => {
    const { addressBook, chainId } = this.props;
    return Object.keys(addressBook?.[chainId] || {}).length > 0;
  };

  renderAddContactButton = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        style={styles.addContact}
        onPress={this.goToAddContact}
        testID={ContactsViewSelectorIDs.ADD_BUTTON}
      >
        {strings('address_book.add_contact')}
      </Button>
    );
  };

  renderEmptyState = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.emptyState}>
        <Icon
          name={IconName.UserCircleAdd}
          size={IconSize.Xl}
          color={IconColor.IconDefault}
        />
        <View style={styles.emptyStateCopy}>
          <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
            {strings('address_book.no_contacts')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            style={styles.emptyStateDescription}
          >
            {strings('address_book.no_contacts_description')}
          </Text>
        </View>
        <View style={styles.emptyStateButton}>
          {this.renderAddContactButton()}
        </View>
      </View>
    );
  };

  render = () => {
    const { reloadAddressList } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance;
    const styles = createStyles(colors);
    const { chainId } = this.props;
    const hasContacts = this.hasContacts();

    return (
      <SafeAreaView
        style={styles.wrapper}
        testID={ContactsViewSelectorIDs.CONTAINER}
        edges={{ bottom: 'additive' }}
      >
        <HeaderStandard
          title={strings('app_settings.contacts_title')}
          onBack={() => this.props.navigation.goBack()}
          includesTopInset
          testID={ContactsViewSelectorIDs.HEADER}
          backButtonProps={{
            testID: ContactsViewSelectorIDs.HEADER_BACK_BUTTON,
          }}
        />
        <View style={styles.content}>
          {hasContacts ? (
            <AddressList
              chainId={chainId}
              onlyRenderAddressBook
              reloadAddressList={reloadAddressList}
              onAccountPress={this.onAddressPress}
              onIconPress={this.onIconPress}
              onAccountLongPress={this.onAddressLongPress}
            />
          ) : (
            this.renderEmptyState()
          )}
        </View>
        {hasContacts ? (
          <View style={styles.footer}>{this.renderAddContactButton()}</View>
        ) : null}
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
