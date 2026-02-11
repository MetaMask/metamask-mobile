// Third party dependencies.
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { SafeAreaView, View } from 'react-native';

// External dependencies.
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../locales/i18n';

// Internal dependencies
import { AddNewAccountProps } from './AddNewAccount.types';
import { AddNewAccountIds } from './AddHdAccount.testIds';
import { addNewHdAccount } from '../../../actions/multiSrp';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Input from '../../../component-library/components/Form/TextField/foundation/Input';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './AddNewAccount.styles';
import { useSelector } from 'react-redux';
import Button, {
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import SRPList from '../../UI/SRPList';
import Logger from '../../../util/Logger';
import {
  MultichainWalletSnapFactory,
  WalletClientType,
} from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import {
  selectInternalAccounts,
  selectSelectedInternalAccount,
} from '../../../selectors/accountsController';
import SRPListItem from '../../UI/SRPListItem';
import { getMultichainAccountName } from '../../../core/SnapKeyring/utils/getMultichainAccountName';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import useMetrics from '../../hooks/useMetrics/useMetrics';
import { useHdKeyringsWithSnapAccounts } from '../../hooks/useHdKeyringsWithSnapAccounts';

const AddNewAccount = ({
  scope,
  clientType,
  onActionComplete,
  onBack,
}: AddNewAccountProps) => {
  const { navigate } = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { colors } = theme;
  const [isLoading, setIsLoading] = useState(false);
  const [accountName, setAccountName] = useState<string | undefined>(undefined);
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const internalAccounts = useSelector(selectInternalAccounts);
  const hdKeyringsWithSnapAccounts = useHdKeyringsWithSnapAccounts();
  const [primaryKeyringId] = hdKeyringsWithSnapAccounts;
  const initialKeyringIdToUse = useMemo(
    () =>
      // For HD accounts (since v29.0.1), use the entropySource if available.
      // Cast to string since it's typed as Json in the keyring API.
      // Fall back to primary keyring ID for non-HD accounts.
      (selectedInternalAccount?.options.entropySource as string) ??
      primaryKeyringId.metadata.id,
    [selectedInternalAccount, primaryKeyringId],
  );
  const [keyringId, setKeyringId] = useState<string>(initialKeyringIdToUse);
  const hasMultipleSRPs = hdKeyringsWithSnapAccounts.length > 1;
  const [showSRPList, setShowSRPList] = useState(false);
  const [error, setError] = useState<string>('');
  const { trackEvent, createEventBuilder } = useMetrics();

  const { keyringToDisplay, keyringIndex } = useMemo(() => {
    const keyring =
      hdKeyringsWithSnapAccounts.find((kr) => kr.metadata.id === keyringId) ??
      hdKeyringsWithSnapAccounts[0];
    return {
      keyringToDisplay: keyring,
      keyringIndex: hdKeyringsWithSnapAccounts.indexOf(keyring) + 1,
    };
  }, [hdKeyringsWithSnapAccounts, keyringId]);

  const handleOnBack = () => {
    if (showSRPList) {
      setShowSRPList(false);
      return;
    }

    if (onBack) {
      onBack();
    } else {
      navigate(Routes.SHEET.ACCOUNT_SELECTOR);
    }
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
      let account: InternalAccount;
      if (clientType && scope) {
        const multichainWalletSnapClient =
          MultichainWalletSnapFactory.createClient(clientType);
        account = (await multichainWalletSnapClient.createAccount({
          scope,
          accountNameSuggestion: accountName,
          entropySource: keyringId,
        })) as InternalAccount;
      } else {
        account = await addNewHdAccount(keyringId, accountName);
      }
      if (onActionComplete) {
        onActionComplete(account);
      } else {
        navigate(Routes.WALLET.HOME);
      }
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
  }, [clientType, scope, onActionComplete, accountName, keyringId, navigate]);

  useEffect(() => {
    setAccountName(getMultichainAccountName(scope, clientType));
  }, [clientType, scope]);

  const addAccountTitle = useMemo(() => {
    if (!clientType) {
      return strings('account_actions.add_account');
    }

    switch (clientType) {
      case WalletClientType.Bitcoin:
        return strings('account_actions.add_multichain_account', {
          networkName: strings('account_actions.headers.bitcoin'),
        });
      case WalletClientType.Solana:
        return strings('account_actions.add_multichain_account', {
          networkName: strings('account_actions.headers.solana'),
        });
      case WalletClientType.Tron:
        return strings('account_actions.add_multichain_account', {
          networkName: strings('account_actions.headers.tron'),
        });
      default:
        return strings('account_actions.add_account');
    }
  }, [clientType]);

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
              : addAccountTitle
          }
          onBack={handleOnBack}
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
                  <View style={styles.srpSelector}>
                    <SRPListItem
                      keyring={keyringToDisplay}
                      name={`${strings(
                        'accounts.secret_recovery_phrase',
                      )} ${keyringIndex}`}
                      onActionComplete={() => {
                        trackEvent(
                          createEventBuilder(
                            MetaMetricsEvents.SECRET_RECOVERY_PHRASE_PICKER_CLICKED,
                          )
                            .addProperties({
                              button_type: 'picker',
                            })
                            .build(),
                        );
                        setShowSRPList(true);
                      }}
                      testID={AddNewAccountIds.SRP_SELECTOR}
                    />
                  </View>
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
                  onPress={handleOnBack}
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
  );
};

export default AddNewAccount;
