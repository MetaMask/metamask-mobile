// Third party dependencies
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { InteractionManager, Platform, SafeAreaView } from 'react-native';

// External dependencies
import { IconName } from '../../../component-library/components/Icons/Icon';
import Text from '../../../component-library/components/Texts/Text/Text';
import { View } from 'react-native-animatable';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import { strings } from '../../../../locales/i18n';
import TextField from '../../../component-library/components/Form/TextField/TextField';
import { formatAddress, getAddressAccountType } from '../../../util/address';

import Button from '../../../component-library/components/Buttons/Button/Button';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon/ButtonIcon';
import { ButtonIconSizes } from '../../../component-library/components/Buttons/ButtonIcon';
import { useStyles } from '../../../component-library/hooks';
import { getEditAccountNameNavBarOptions } from '../../../components/UI/Navbar';
import Engine from '../../../core/Engine';
import generateTestId from '../../../../wdio/utils/generateTestId';
import Analytics from '../../../core/Analytics/Analytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { selectChainId } from '../../../selectors/networkController';

// Internal dependencies
import styleSheet from './EditAccountName.styles';

const EditAccountName = () => {
  const { styles } = useStyles(styleSheet, {});
  const { setOptions, goBack, navigate } = useNavigation();
  const [accountName, setAccountName] = useState<string>();

  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );
  const identities = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.identities,
  );

  const chainId = useSelector(selectChainId);

  const updateNavBar = useCallback(() => {
    setOptions(
      getEditAccountNameNavBarOptions(
        <Text variant={TextVariant.HeadingMD}>
          {strings('account_actions.edit_name')}
        </Text>,
        () => (
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSizes.Lg}
            style={styles.headerRight}
            onPress={() => goBack()}
          />
        ),
      ),
    );
  }, [setOptions, goBack, styles]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  useEffect(() => {
    setAccountName(identities[selectedAddress].name);
  }, [selectedAddress, identities]);

  const onChangeName = (name: string) => {
    setAccountName(name);
  };

  const saveAccountName = () => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setAccountLabel(selectedAddress, accountName);
    navigate('WalletView');

    InteractionManager.runAfterInteractions(() => {
      const analyticsProperties = () => {
        const accounType = getAddressAccountType(selectedAddress);

        const initialProperties = { account_type: accounType, chainId };
        if (accounType === 'Imported') {
          return {
            ...initialProperties,
            // It's being checked what's the best value for this prop
            account_import_type: 'true',
          };
        }
        if (accounType === 'QR') {
          return {
            ...initialProperties,
            // It's being checked what's the best value for this prop
            account_hardware_type: 'true',
            //account_hardware_version: 'version?'
          };
        }

        return initialProperties;
      };
      Analytics.trackEventWithParameters(
        MetaMetricsEvents.ACCOUNT_RENAMED,
        analyticsProperties(),
      );
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View>
        <View style={styles.inputContainer}>
          <Text variant={TextVariant.BodyLGMedium}>
            {strings('address_book.name')}
          </Text>
          <TextField
            value={accountName}
            onChangeText={onChangeName}
            {...generateTestId(Platform, 'account-name-input')}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text variant={TextVariant.BodyLGMedium}>
            {strings('address_book.address')}
          </Text>
          <TextField
            isDisabled
            placeholder={formatAddress(selectedAddress, 'mid')}
          />
        </View>
      </View>
      <View style={styles.buttonsContainer}>
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          label={strings('address_book.cancel')}
          onPress={() => goBack()}
          style={styles.cancelButton}
        />
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          label={strings('address_book.save')}
          onPress={saveAccountName}
          style={
            !accountName?.length ? styles.saveButtonDisabled : styles.saveButton
          }
          disabled={!accountName?.length}
          {...generateTestId(Platform, 'save-button')}
        />
      </View>
    </SafeAreaView>
  );
};

export default EditAccountName;
