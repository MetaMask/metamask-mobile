// Third party dependencies
import React, { useCallback, useEffect, useState } from 'react';
import {
  useRoute,
  useNavigation,
  RouteProp,
  ParamListBase,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { InteractionManager, SafeAreaView } from 'react-native';

// External dependencies
import { InternalAccount } from '@metamask/keyring-internal-api';
import Text from '../../../component-library/components/Texts/Text/Text';
import { View } from 'react-native-animatable';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import { strings } from '../../../../locales/i18n';
import TextField from '../../../component-library/components/Form/TextField/TextField';
import { formatAddress, getAddressAccountType } from '../../../util/address';
import { EditAccountNameSelectorIDs } from './EditAccountName.testIds';

import Button from '../../../component-library/components/Buttons/Button/Button';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../component-library/hooks';
import { getEditAccountNameNavBarOptions } from '../../../components/UI/Navbar';
import Engine from '../../../core/Engine';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { selectChainId } from '../../../selectors/networkController';
import {
  doENSReverseLookup,
  isDefaultAccountName,
} from '../../../util/ENSUtils';
import { useTheme } from '../../../util/theme';
import { toChecksumHexAddress } from '@metamask/controller-utils';

// Internal dependencies
import styleSheet from './EditAccountName.styles';
import { getDecimalChainId } from '../../../util/networks';
import { useMetrics } from '../../../components/hooks/useMetrics';

interface RootNavigationParamList extends ParamListBase {
  EditAccountName: {
    selectedAccount: InternalAccount;
  };
}

type EditAccountNameRouteProp = RouteProp<
  RootNavigationParamList,
  'EditAccountName'
>;

const EditAccountName = () => {
  const route = useRoute<EditAccountNameRouteProp>();
  const { selectedAccount } = route.params;
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { styles } = useStyles(styleSheet, {});
  const { setOptions, goBack, navigate } = useNavigation();
  const [accountName, setAccountName] = useState<string>();
  const [ens, setEns] = useState<string>();

  const selectedChecksummedAddress = selectedAccount?.address
    ? toChecksumHexAddress(selectedAccount.address)
    : undefined;

  const chainId = useSelector(selectChainId);

  const lookupEns = useCallback(async () => {
    if (selectedChecksummedAddress) {
      try {
        const accountEns = await doENSReverseLookup(
          selectedChecksummedAddress,
          chainId,
        );

        setEns(accountEns);
        // eslint-disable-next-line no-empty
      } catch {}
    }
  }, [selectedChecksummedAddress, chainId]);

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
    const name = selectedAccount?.metadata.name;
    setAccountName(isDefaultAccountName(name) && ens ? ens : name);
  }, [ens, selectedAccount?.metadata.name]);

  const onChangeName = (name: string) => {
    setAccountName(name);
  };

  const saveAccountName = async () => {
    InteractionManager.runAfterInteractions(async () => {
      if (accountName && accountName.length > 0 && selectedAccount?.address) {
        Engine.setAccountLabel(selectedAccount?.address, accountName);
        navigate('WalletView');

        try {
          const analyticsProperties = async () => {
            const accountType = getAddressAccountType(selectedAccount?.address);
            const account_type =
              accountType === 'QR Hardware' ? 'hardware' : accountType;
            return { account_type, chain_id: getDecimalChainId(chainId) };
          };
          const analyticsProps = await analyticsProperties();
          trackEvent(
            createEventBuilder(MetaMetricsEvents.ACCOUNT_RENAMED)
              .addProperties(analyticsProps)
              .build(),
          );
        } catch {
          return {};
        }
      }
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
            testID={EditAccountNameSelectorIDs.ACCOUNT_NAME_INPUT}
            autoFocus
          />
        </View>
        <View style={styles.inputContainer}>
          <Text variant={TextVariant.BodyLGMedium}>
            {strings('address_book.address')}
          </Text>
          {selectedAccount?.address ? (
            <TextField
              isDisabled
              placeholder={formatAddress(selectedAccount?.address, 'mid')}
              autoFocus
              testID="input"
            />
          ) : null}
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
          testID={EditAccountNameSelectorIDs.EDIT_ACCOUNT_NAME_SAVE}
        />
      </View>
    </SafeAreaView>
  );
};

export default EditAccountName;
