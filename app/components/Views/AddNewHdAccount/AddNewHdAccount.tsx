// Third party dependencies.
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View } from 'react-native';

// External dependencies.
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Icon, {
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';

// Internal dependencies
import { AddNewHdAccountProps } from './AddNewHdAccount.types';
import { AddNewAccountIds } from '../../../../e2e/selectors/MultiSRP/AddHdAccount.selectors';
import { addNewHdAccount } from '../../../actions/multiSrp';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Input from '../../../component-library/components/Form/TextField/foundation/Input';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './AddNewHdAccount.styles';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import { selectHDKeyrings } from '../../../selectors/keyringController';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import SRPList from '../../UI/SRPList';
import Logger from '../../../util/Logger';
import { KeyringTypes } from '@metamask/keyring-controller';
import { getHdKeyringOfSelectedAccountOrPrimaryKeyring } from '../../../selectors/multisrp';

const AddNewHdAccount = ({ onBack }: AddNewHdAccountProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;
  const [isLoading, setIsLoading] = useState(false);
  const [accountName, setAccountName] = useState<string | undefined>(undefined);
  const keyringOfSelectedAccount = useSelector(
    getHdKeyringOfSelectedAccountOrPrimaryKeyring,
  );
  const [keyringId, setKeyringId] = useState<string>(
    keyringOfSelectedAccount.metadata.id,
  );
  const hdKeyrings = useSelector(selectHDKeyrings);
  const [showSRPList, setShowSRPList] = useState(false);

  const onSubmit = async () => {
    setIsLoading(true);
    try {
      await addNewHdAccount(keyringId, accountName);
      onBack();
    } catch (e) {
      Logger.error(e as Error, 'ADD_NEW_HD_ACCOUNT_ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setAccountName(
      Engine.context.AccountsController.getNextAvailableAccountName(
        KeyringTypes.hd,
      ),
    );
  }, []);

  const hdKeyringIndex = useMemo(
    () =>
      hdKeyrings.findIndex((keyring) => keyring.metadata.id === keyringId) + 1,
    [hdKeyrings, keyringId],
  );

  const numberOfAccounts = useMemo(() => {
    const keyring = hdKeyrings.find((kr) => kr.metadata.id === keyringId);
    return keyring ? keyring.accounts.length : 0;
  }, [hdKeyrings, keyringId]);

  const onKeyringSelection = (id: string) => {
    setShowSRPList(false);
    setKeyringId(id);
  };

  return (
    <SafeAreaView testID={AddNewAccountIds.CONTAINER}>
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
                <Input
                  testID={AddNewAccountIds.NAME_INPUT}
                  textVariant={TextVariant.BodyMDMedium}
                  style={styles.accountInput}
                  value={accountName}
                  onChangeText={(newName: string) => {
                    setAccountName(newName);
                  }}
                  placeholder={accountName}
                  placeholderTextColor={colors.text.default}
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
                  testID={AddNewAccountIds.SRP_SELECTOR}
                >
                  <View style={styles.srp}>
                    <View>
                      <Text variant={TextVariant.BodyMDMedium}>{`${strings(
                        'accounts.secret_recovery_phrase',
                      )} ${hdKeyringIndex}`}</Text>
                    </View>
                    <View>
                      <Text
                        variant={TextVariant.BodyMD}
                        color={TextColor.Primary}
                      >{`${strings(
                        'accounts.show_accounts',
                      )} ${numberOfAccounts} ${strings(
                        'accounts.accounts',
                      )}`}</Text>
                    </View>
                  </View>
                  <Icon style={styles.srpArrow} name={IconName.ArrowRight} />
                </TouchableOpacity>
                <Text variant={TextVariant.BodySM}>
                  {strings('accounts.add_new_hd_account_helper_text')}
                </Text>
              </View>
              <View style={styles.footerContainer}>
                <Button
                  testID={AddNewAccountIds.CANCEL}
                  loading={isLoading}
                  style={styles.footerContainer.button}
                  variant={ButtonVariants.Secondary}
                  onPress={onBack}
                  labelTextVariant={TextVariant.BodyMD}
                  label={strings('accounts.cancel')}
                />
                <Button
                  testID={AddNewAccountIds.CONFIRM}
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
