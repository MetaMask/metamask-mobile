import React, { forwardRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TouchableWithoutFeedback,
} from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/Ionicons';

import Label from '../../../../../../component-library/components/Form/Label';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import TextField, {
  TextFieldSize,
} from '../../../../../../component-library/components/Form/TextField';
import { TextFieldProps } from '../../../../../../component-library/components/Form/TextField/TextField.types';
import { Theme } from '../../../../../../util/theme/models';
import { useStyles } from '../../../../../../component-library/hooks';
import { formatPhoneNumber } from '../../utils';
import { CountryCode, E164Number } from 'libphonenumber-js';
import PhoneInput from 'react-phone-number-input/react-native-input';
import { AVAILABLE_COUNTRIES_PHONE_INPUT } from '../../constants';
import {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import ListItemSelect from '../../../../../../component-library/components/List/ListItemSelect';
import ModalDragger from '../../../../../Base/ModalDragger';
import { useTheme } from '../../../../../../util/theme';
import IonicIcon from 'react-native-vector-icons/Ionicons';

interface PhoneFieldProps
  extends Omit<TextFieldProps, 'size' | 'onChangeText'> {
  label: string;
  onChangeText: (text: string) => void;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  countryCode?: CountryCode;
  countryFlag?: string;
}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    label: {
      marginBottom: 6,
    },
    field: {
      flexDirection: 'column',
      marginBottom: 16,
    },
    phoneInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    countryPrefix: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    countryFlag: {
      fontSize: 16,
      marginRight: 4,
    },
    countryCode: {
      fontSize: 14,
    },
    phoneInput: {
      flex: 1,
    },
    error: {
      color: theme.colors.error.default,
      fontSize: 12,
      marginTop: 4,
    },
    // Modal styles
    modal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    modalView: {
      backgroundColor: theme.colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 10,
      maxHeight: '70%',
      minHeight: '100%',
      display: 'flex',
    },
    modalHeader: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.alternative,
      borderRadius: 8,
      marginHorizontal: 16,
      marginVertical: 16,
      paddingHorizontal: 12,
    },
    searchIcon: {
      color: theme.colors.icon.alternative,
      marginRight: 8,
    },
    input: {
      flex: 1,
      color: theme.colors.text.default,
      fontSize: 16,
      paddingVertical: 12,
    },
    countryPickerContainer: {
      flex: 1,
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    countryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    countryItemFlag: {
      fontSize: 20,
      marginRight: 12,
    },
    countryItemText: {
      fontSize: 16,
    },
  });
};

const DepositPhoneField = forwardRef<TextInput, PhoneFieldProps>(
  (
    {
      label,
      onChangeText,
      error,
      countryCode = 'US',
      countryFlag = '🇺🇸',
      ...textFieldProps
    },
    ref,
  ) => {
    const { styles, theme } = useStyles(styleSheet, {});
    const { colors } = useTheme();

    const [formattedPhoneNumber, setFormattedPhoneNumber] = useState('');
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const defaultRegion = AVAILABLE_COUNTRIES_PHONE_INPUT.find(
      (country) => country.code === 'US',
    );
    const [region, setRegion] = useState(defaultRegion);

    const searchInputRef = React.useRef<TextInput>(null);

    const handlePhoneNumberChange = (value?: E164Number | undefined) => {
      setFormattedPhoneNumber(value || '');
    };

    const filteredCountries = React.useMemo(() => {
      if (!searchQuery) return AVAILABLE_COUNTRIES_PHONE_INPUT;
      return AVAILABLE_COUNTRIES_PHONE_INPUT.filter(
        (country) =>
          country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          country.code.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }, [searchQuery]);

    const handleCountrySelect = (
      country: (typeof AVAILABLE_COUNTRIES_PHONE_INPUT)[0],
    ) => {
      setRegion(country);
      setShowCountryPicker(false);
      setSearchQuery('');
    };

    const handleOpenCountryPicker = () => {
      setShowCountryPicker(true);
    };

    const handleCloseCountryPicker = () => {
      setShowCountryPicker(false);
      setSearchQuery('');
    };

    const handleSearchPress = () => searchInputRef?.current?.focus();

    const handleClearSearch = () => {
      setSearchQuery('');
      searchInputRef?.current?.focus();
    };

    const renderCountryItem = ({
      item,
    }: {
      item: (typeof AVAILABLE_COUNTRIES_PHONE_INPUT)[0];
    }) => (
      <ListItemSelect
        onPress={() => handleCountrySelect(item)}
        isSelected={region?.code === item.code}
      >
        <View style={styles.countryItem}>
          <Text style={styles.countryItemFlag}>{item.flag}</Text>
          <Text style={styles.countryItemText}>{item.name}</Text>
        </View>
      </ListItemSelect>
    );

    return (
      <View style={styles.field}>
        <Label variant={TextVariant.HeadingSMRegular} style={styles.label}>
          {label}
        </Label>
        <View style={styles.phoneInputWrapper}>
          <PhoneInput
            ref={ref}
            defaultCountry="US"
            country={region?.code}
            international={region?.code !== 'US'}
            value={formattedPhoneNumber}
            onChange={handlePhoneNumberChange}
            inputComponent={(props: any) => (
              <TextField
                autoFocus
                startAccessory={
                  <TouchableOpacity onPress={handleOpenCountryPicker}>
                    <View style={styles.countryPrefix}>
                      <Text style={styles.countryFlag}>
                        {region?.flag || countryFlag}
                      </Text>
                      <IonicIcon
                        name="chevron-down"
                        size={16}
                        color={theme.colors.icon.alternative}
                      />
                    </View>
                  </TouchableOpacity>
                }
                size={TextFieldSize.Lg}
                placeholderTextColor={theme.colors.text.muted}
                keyboardAppearance={theme.themeAppearance}
                placeholder="(123) 456-7890"
                keyboardType="phone-pad"
                style={styles.phoneInput}
                {...textFieldProps}
                {...props}
              />
            )}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Modal
          isVisible={showCountryPicker}
          onBackdropPress={handleCloseCountryPicker}
          onBackButtonPress={handleCloseCountryPicker}
          swipeDirection="down"
          onSwipeComplete={handleCloseCountryPicker}
          backdropColor={colors.overlay.default}
          backdropOpacity={1}
          style={styles.modal}
        >
          <SafeAreaView style={styles.modalView}>
            <ModalDragger />
            <View style={styles.modalHeader}>
              <Text variant={TextVariant.HeadingMD}>Select Country</Text>
              <TouchableOpacity onPress={handleCloseCountryPicker}>
                <Icon name="close" size={24} color={colors.icon.default} />
              </TouchableOpacity>
            </View>

            <TouchableWithoutFeedback onPress={handleSearchPress}>
              <View style={styles.inputWrapper}>
                <Icon name="search" size={20} style={styles.searchIcon} />
                <TextInput
                  ref={searchInputRef}
                  style={styles.input}
                  placeholder="Search countries..."
                  placeholderTextColor={colors.text.muted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={handleClearSearch}>
                    <Icon
                      name="close-circle"
                      size={20}
                      color={colors.text.muted}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>

            <View style={styles.countryPickerContainer}>
              <FlatList
                data={filteredCountries}
                renderItem={renderCountryItem}
                keyExtractor={(item) => item.code}
                // showsVerticalScrollIndicator={true}
                ListEmptyComponent={() => (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text variant={TextVariant.BodyMD}>No countries found</Text>
                  </View>
                )}
              />
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    );
  },
);

export default DepositPhoneField;
