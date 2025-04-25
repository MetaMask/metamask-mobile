// Third party dependencies.
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SafeAreaView, View } from 'react-native';

// External dependencies.
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Icon, {
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';

// Internal dependencies
import { AddNewAccountProps } from './AddNewAccount.types';
import { AddNewAccountIds } from '../../../../e2e/selectors/MultiSRP/AddHdAccount.selectors';
import { addNewHdAccount } from '../../../actions/multiSrp';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Input from '../../../component-library/components/Form/TextField/foundation/Input';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './AddNewAccount.styles';
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
import {
  MultichainWalletSnapFactory,
  WalletClientType,
} from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import { MultichainNetwork } from '@metamask/multichain-transactions-controller';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import { selectInternalAccounts } from '../../../selectors/accountsController';

const AddNewAccount = ({ route }: AddNewAccountProps) => {
  const { navigate } = useNavigation();
  const { scope, clientType } = route?.params || {};
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;
  const [isLoading, setIsLoading] = useState(false);
  const [accountName, setAccountName] = useState<string | undefined>(undefined);
  const internalAccounts = useSelector(selectInternalAccounts);
  const keyringOfSelectedAccount = useSelector(
    getHdKeyringOfSelectedAccountOrPrimaryKeyring,
  );
  const [keyringId, setKeyringId] = useState<string>(
    keyringOfSelectedAccount.metadata.id,
  );
  const hdKeyrings = useSelector(selectHDKeyrings);
  const hasMultipleSRPs = hdKeyrings.length > 1;
  const [showSRPList, setShowSRPList] = useState(false);
  const [error, setError] = useState<string>('');

  const onBack = () => {
    navigate(Routes.SHEET.ACCOUNT_SELECTOR);
  };

  const isDuplicateName = useMemo(
    () =>
      Object.values(internalAccounts).some(
        (account) =>
          account.metadata.name.toLowerCase() === accountName?.toLowerCase(),
      ),
    [accountName, internalAccounts],
  );

  const onSubmit = useCallback(async () => {
    if ((clientType && !scope) || (!clientType && scope)) {
      throw new Error('Scope and clientType must be provided');
    }

    setIsLoading(true);
    try {
      if (clientType && scope) {
        const multichainWalletSnapClient =
          MultichainWalletSnapFactory.createClient(clientType);
        await multichainWalletSnapClient.createAccount({
          scope,
          accountNameSuggestion: accountName,
          entropySource: keyringId,
        });
      } else {
        await addNewHdAccount(keyringId, accountName);
      }
      navigate(Routes.WALLET.HOME);
    } catch (e: unknown) {
      const errorMessage = strings(
        'accounts.error_messages.failed_to_create_account',
        {
          clientType: clientType ?? 'hd',
        },
      );
      setError(errorMessage);
      Logger.error(e as Error, errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [clientType, scope, accountName, keyringId, navigate]);

  useEffect(() => {
    const nextAvailableAccountName =
      Engine.context.AccountsController.getNextAvailableAccountName(
        clientType ? KeyringTypes.snap : KeyringTypes.hd,
      );
    const accountNumber = nextAvailableAccountName.split(' ').pop();

    let accountNameToUse = nextAvailableAccountName;
    switch (clientType) {
      case WalletClientType.Bitcoin: {
        if (scope === MultichainNetwork.BitcoinTestnet) {
          accountNameToUse = `${strings(
            'accounts.labels.bitcoin_testnet_account_name',
          )} ${accountNumber}`;
          break;
        }
        accountNameToUse = `${strings(
          'accounts.labels.bitcoin_account_name',
        )} ${accountNumber}`;
        break;
      }
      case WalletClientType.Solana: {
        switch (scope) {
          case MultichainNetwork.SolanaDevnet:
            accountNameToUse = `${strings(
              'accounts.labels.solana_devnet_account_name',
            )} ${accountNumber}`;
            break;
          case MultichainNetwork.SolanaTestnet:
            accountNameToUse = `${strings(
              'accounts.labels.solana_testnet_account_name',
            )} ${accountNumber}`;
            break;
          default:
            accountNameToUse = `${strings(
              'accounts.labels.solana_account_name',
            )} ${accountNumber}`;
            break;
        }
        break;
      }
      default:
        break;
    }
    setAccountName(accountNameToUse);
  }, [clientType, scope]);

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
    <BottomSheet ref={sheetRef}>
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
                {hasMultipleSRPs && (
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
                      <Icon
                        style={styles.srpArrow}
                        name={IconName.ArrowRight}
                      />
                    </TouchableOpacity>
                    <Text variant={TextVariant.BodySM}>
                      {strings('accounts.add_new_hd_account_helper_text')}
                    </Text>
                  </View>
                )}
                <View style={styles.footerContainer}>
                  <Button
                    testID={AddNewAccountIds.CANCEL}
                    loading={isLoading}
                    style={styles.button}
                    variant={ButtonVariants.Secondary}
                    onPress={onBack}
                    labelTextVariant={TextVariant.BodyMD}
                    label={strings('accounts.cancel')}
                  />
                  <Button
                    testID={AddNewAccountIds.CONFIRM}
                    loading={isLoading}
                    isDisabled={isLoading || isDuplicateName}
                    style={styles.button}
                    variant={ButtonVariants.Primary}
                    onPress={onSubmit}
                    labelTextVariant={TextVariant.BodyMD}
                    label={strings('accounts.add')}
                  />
                </View>
                {error && (
                  <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                    {error}
                  </Text>
                )}
              </Fragment>
            </View>
          )}
        </Fragment>
      </SafeAreaView>
    </BottomSheet>
  );
};

export default AddNewAccount;
