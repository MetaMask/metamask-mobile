// Third party dependencies
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { InteractionManager, Platform, SafeAreaView } from 'react-native';

// External dependencies
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
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../component-library/hooks';
import { getEditAccountNameNavBarOptions } from '../../../components/UI/Navbar';
import Engine from '../../../core/Engine';
import generateTestId from '../../../../wdio/utils/generateTestId';
import Analytics from '../../../core/Analytics/Analytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { selectChainId } from '../../../selectors/networkController';
import {
  selectIdentities,
  selectSelectedAddress,
} from '../../../selectors/preferencesController';
import {
  doENSReverseLookup,
  isDefaultAccountName,
} from '../../../util/ENSUtils';
import { useTheme } from '../../../util/theme';

// Internal dependencies
import styleSheet from './EditAccountName.styles';

const EditAccountName = () => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});
  const { setOptions, goBack, navigate } = useNavigation();
  const [accountName, setAccountName] = useState<string>();
  const [ens, setEns] = useState<string>();

  const selectedAddress = useSelector(selectSelectedAddress);
  const identities = useSelector(selectIdentities);

  const chainId = useSelector(selectChainId);

  const lookupEns = useCallback(async () => {
    try {
      const accountEns = await doENSReverseLookup(selectedAddress, chainId);

      setEns(accountEns);
      // eslint-disable-next-line no-empty
    } catch {}
  }, [selectedAddress, chainId]);

  useEffect(() => {
    lookupEns();
  }, [lookupEns]);

  const updateNavBar = useCallback(() => {
    setOptions(getEditAccountNameNavBarOptions(goBack, colors));
  }, [setOptions, goBack, colors]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  useEffect(() => {
    const name = identities[selectedAddress].name;
    setAccountName(isDefaultAccountName(name) && ens ? ens : name);
  }, [selectedAddress, identities, ens]);

  const onChangeName = (name: string) => {
    setAccountName(name);
  };

  const saveAccountName = () => {
    const { PreferencesController } = Engine.context;
    PreferencesController.setAccountLabel(selectedAddress, accountName);
    navigate('WalletView');

    InteractionManager.runAfterInteractions(() => {
      const analyticsProperties = async () => {
        const accountType = getAddressAccountType(selectedAddress);
        const account_type = accountType === 'QR' ? 'hardware' : accountType;
        return { account_type, chain_id: chainId };
      };
      Analytics.trackEventWithParameters(
        MetaMetricsEvents.ACCOUNT_RENAMED,
        analyticsProperties(),
      );
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.inputsContainer}>
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
          width={ButtonWidthTypes.Full}
          label={strings('address_book.cancel')}
          onPress={goBack}
          style={styles.cancelButton}
        />
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('address_book.save')}
          onPress={saveAccountName}
          style={
            !accountName?.length
              ? { ...styles.saveButton, ...styles.saveButtonDisabled }
              : styles.saveButton
          }
          disabled={!accountName?.length || accountName?.trim() === ''}
          {...generateTestId(Platform, 'save-button')}
        />
      </View>
    </SafeAreaView>
  );
};

export default EditAccountName;
