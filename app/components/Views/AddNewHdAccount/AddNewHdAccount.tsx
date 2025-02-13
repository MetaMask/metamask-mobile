// Third party dependencies.
import React, { Fragment, useCallback, useMemo, useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Icon, {
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';

// Internal dependencies
import { AddNewHdAccountProps } from './AddNewHdAccount.types';
import { useMetrics } from '../../../components/hooks/useMetrics';

import { addNewHdAccount } from '../../../actions/multiSrp';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Input from '../../../component-library/components/Form/TextField/foundation/Input';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './AddNewHdAccount.styles';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import { selectKeyrings } from '../../../selectors/keyringController';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import SRPList from '../../UI/SRPList';
import { set } from 'lodash';
import Logger from '../../../util/Logger';

const AddNewHdAccount = ({ onBack }: AddNewHdAccountProps) => {
  const { styles } = useStyles(styleSheet, {});
  const { navigate } = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isLoading, setIsLoading] = useState(false);
  const [accountName, setAccountName] = useState('');
  const keyrings = useSelector(selectKeyrings);
  const [keyringId, setKeyringId] = useState<string | undefined>(
    keyrings[0].metadata.id,
  );
  const [showSRPList, setShowSRPList] = useState(false);

  const onSubmit = async () => {
    setIsLoading(true);
    try {
      await addNewHdAccount(keyringId, accountName);
      onBack();
    } catch (e) {
      Logger.error(e, 'ADD_NEW_HD_ACCOUNT_ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  const getNextAccountName = useCallback(() => {
    const { AccountsController } = Engine.context;
    return AccountsController.getNextAvailableAccountName(
      ExtendedKeyringTypes.hd,
    );
  }, []);

  const hdKeyringIndex = useMemo(
    () =>
      keyrings
        .filter((keyring) => keyring.type === ExtendedKeyringTypes.hd)
        .findIndex((keyring) => keyring.metadata.id === keyringId) + 1,
    [keyrings, keyringId],
  );

  const numberOfAccounts = useMemo(
    () =>
      keyrings.find((keyring) => keyring.metadata.id === keyringId)?.accounts
        .length,
    [keyrings, keyringId],
  );

  const onKeyringSelection = (id: string) => {
    setShowSRPList(false);
    setKeyringId(id);
  };

  return (
    <SafeAreaView>
      <Fragment>
        <SheetHeader
          title={
            showSRPList
              ? strings('accounts.select_secret_recovery_phrase')
              : strings('account_actions.add_account')
          }
          onBack={() => {
            if (showSRPList) {
              setShowSRPList(false);
              return;
            }
            onBack();
          }}
        />
        {showSRPList ? (
          <SRPList onKeyringSelect={(id) => onKeyringSelection(id)} />
        ) : (
          <View style={styles.base}>
            <Fragment>
              <View style={styles.accountInputContainer}>
                <Text variant={TextVariant.BodyMDMedium}>
                  {strings('accounts.account_name')}
                </Text>
                <Input
                  style={styles.accountInput}
                  onChangeText={setAccountName}
                  placeholder={getNextAccountName()}
                  onSubmitEditing={onSubmit}
                />
              </View>
              <View style={styles.srpSelectorContainer}>
                <Text variant={TextVariant.BodyMDMedium}>
                  {strings('accounts.select_secret_recovery_phrase')}
                </Text>
                <TouchableOpacity
                  style={styles.srpSelector}
                  onPress={() => setShowSRPList(true)}
                >
                  <View style={styles.srp}>
                    <View>
                      <Text variant={TextVariant.BodyMDMedium}>{`${strings(
                        'accounts.secret_recovery_phrase',
                      )} ${hdKeyringIndex}`}</Text>
                    </View>
                    <View>
                      <Text>{`(${numberOfAccounts} ${strings(
                        'accounts.accounts',
                      )})`}</Text>
                    </View>
                  </View>
                  <Icon style={styles.srpArrow} name={IconName.ArrowRight} />
                </TouchableOpacity>
                <Text>
                  {strings('accounts.add_new_hd_account_helper_text')}
                </Text>
              </View>
              <View style={styles.footerContainer}>
                <Button
                  loading={isLoading}
                  style={styles.footerContainer.button}
                  variant={ButtonVariants.Secondary}
                  onPress={onBack}
                  labelTextVariant={TextVariant.BodyMD}
                  label={strings('accounts.cancel')}
                >
                  {strings()}
                </Button>
                <Button
                  loading={isLoading}
                  style={styles.footerContainer.button}
                  variant={ButtonVariants.Primary}
                  onPress={onSubmit}
                  labelTextVariant={TextVariant.BodyMD}
                  label={strings('accounts.add')}
                />
              </View>
            </Fragment>
          </View>
        )}
      </Fragment>
    </SafeAreaView>
  );
};

export default AddNewHdAccount;
