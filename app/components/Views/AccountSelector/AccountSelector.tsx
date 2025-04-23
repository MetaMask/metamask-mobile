// Third party dependencies.
import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { View } from 'react-native';

// External dependencies.
import AccountSelectorList from '../../UI/AccountSelectorList';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import UntypedEngine from '../../../core/Engine';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { strings } from '../../../../locales/i18n';
// import { useAccounts } from '../../hooks/useAccounts';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import AddAccountActions from '../AddAccountActions';
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { selectPrivacyMode } from '../../../selectors/preferencesController';

// Internal dependencies.
import {
  AccountSelectorProps,
  AccountSelectorScreens,
} from './AccountSelector.types';
import styles from './AccountSelector.styles';
import { useDispatch, useSelector } from 'react-redux';
import { setReloadAccounts } from '../../../actions/accounts';
import { RootState } from '../../../reducers';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { TraceName, endTrace } from '../../../util/trace';
import AddNewHdAccount from '../AddNewHdAccount';

const AccountSelector = ({ route }: AccountSelectorProps) => {
  const renderCountRef = useRef(0);

  // Increment render count on each render
  renderCountRef.current += 1;
  // eslint-disable-next-line no-console
  console.log(`AccountSelector rendered ${renderCountRef.current} times`);

  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();
  const {
    onSelectAccount,
    checkBalanceError,
    disablePrivacyMode,
    navigateToAddAccountActions,
  } = route.params || {};

  const { reloadAccounts } = useSelector((state: RootState) => state.accounts);
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Engine = UntypedEngine as any;
  const privacyMode = useSelector(selectPrivacyMode);
  const sheetRef = useRef<BottomSheetRef>(null);

  const ensByAccountAddress = useMemo(() => ({}), []);

  const accounts = useMemo(
    () => [
      {
        name: 'Account 1',
        address: '0x9502171DCf537A5E48EA962E100d37040F25D744',
        type: 'HD Key Tree',
        yOffset: 0,
        isSelected: false,
        assets: {
          fiatBalance: '$0.32\n0.00019 ETH',
        },
      },
      {
        name: 'Account 2',
        address: '0x753a7d36b502963059dbDAdc312a3dB381Deb57c',
        type: 'HD Key Tree',
        yOffset: 78,
        isSelected: false,
        assets: {
          fiatBalance: '$0.00\n0 ETH',
        },
      },
      {
        name: 'Account 3',
        address: '0x66398A244146ebF80AC6220c8Bb446Ae65172614',
        type: 'HD Key Tree',
        yOffset: 156,
        isSelected: false,
        assets: {
          fiatBalance: '$0.90\n0.00052 ETH',
        },
      },
      {
        name: 'Account 4',
        address: '0x0a31dD35b55469275DC63163aBF585D9a5A75509',
        type: 'HD Key Tree',
        yOffset: 234,
        isSelected: false,
        assets: {
          fiatBalance: '$0.00\n0 ETH',
        },
      },
      {
        name: 'Account 5',
        address: '0x3750a4740D5AfB02854978Fcdf28363213F6C6e2',
        type: 'HD Key Tree',
        yOffset: 312,
        isSelected: false,
        assets: {
          fiatBalance: '$0.00\n0 ETH',
        },
      },
      {
        name: 'Account 6',
        address: '0xfF15aC15376a5ADEdeD1946F3d613E5B2AEd3962',
        type: 'HD Key Tree',
        yOffset: 390,
        isSelected: false,
        assets: {
          fiatBalance: '$0.00\n0 ETH',
        },
      },
      {
        name: 'Account 7',
        address: '0xe61321c8d2bcB2739FD295F9aE3c3b78E0481252',
        type: 'HD Key Tree',
        yOffset: 468,
        isSelected: false,
        assets: {
          fiatBalance: '$0.00\n0 ETH',
        },
      },
      {
        name: 'Account 8',
        address: '0x392B80f64A15D477FC719f77EAA7DBB0f43DBf07',
        type: 'HD Key Tree',
        yOffset: 546,
        isSelected: false,
        assets: {
          fiatBalance: '$0.00\n0 ETH',
        },
      },
      {
        name: 'Account 9',
        address: '0xA889A680aDb93E491dB910365970Ec89F2496EF1',
        type: 'HD Key Tree',
        yOffset: 624,
        isSelected: false,
        assets: {
          fiatBalance: '$0.00\n0 ETH',
        },
      },
      {
        name: 'Account 10',
        address: '0x5FF406Fb307a11BA4c07F81364E0d509769f9174',
        type: 'HD Key Tree',
        yOffset: 702,
        isSelected: false,
        assets: {
          fiatBalance: '$0.00\n0 ETH',
        },
      },
      {
        name: 'Account 11',
        address: '0xB88b2C8Cc0DD85d5A8aBb96D3b1BE726439a1eC8',
        type: 'HD Key Tree',
        yOffset: 780,
        isSelected: false,
        assets: {
          fiatBalance: '$0.00\n0 ETH',
        },
      },
      {
        name: 'Account 12',
        address: '0xee80Ac74843b7820432dE8f43F51f06D65AB7083',
        type: 'HD Key Tree',
        yOffset: 858,
        isSelected: false,
        assets: {
          fiatBalance: '$0.00\n0 ETH',
        },
      },
      {
        name: 'Account 13',
        address: '0x398035eFeE8a324f3248500EA17c93C748e61508',
        type: 'HD Key Tree',
        yOffset: 936,
        isSelected: false,
        assets: {
          fiatBalance: '$0.00\n0 ETH',
        },
      },
      {
        name: 'Account 14',
        address: '0x19E06e19302D2262A8E95895d42FF6b515d02Ed6',
        type: 'HD Key Tree',
        yOffset: 1014,
        isSelected: false,
        assets: {
          fiatBalance: '$0.00\n0 ETH',
        },
      },
      {
        name: 'Account 15',
        address: '0x172Eef6e2C07d85139f93ce7d497AeDe3a418673',
        type: 'HD Key Tree',
        yOffset: 1092,
        isSelected: false,
        assets: {
          fiatBalance: '$0.00\n0 ETH',
        },
      },
      {
        name: 'Cool account',
        address: '0x49Bd1f5119D8f2b13c1B14F3Bfa06C7B1d16d0Be',
        type: 'HD Key Tree',
        yOffset: 1170,
        isSelected: false,
        assets: {
          fiatBalance: '$0.00\n0 ETH',
        },
      },
      {
        name: 'Solana Account 1',
        address: 'DtMUkCoeyzs35B6EpQQxPyyog6TRwXxV1W1Acp8nWBNa',
        type: 'Snap Keyring',
        yOffset: 1248,
        isSelected: true,
        assets: {
          fiatBalance: '$6.32\n0.012223519 SOL',
        },
      },
    ],
    [],
  );

  // console.log('accounts', JSON.stringify(accounts, null, 2));
  const [screen, setScreen] = useState<AccountSelectorScreens>(
    navigateToAddAccountActions ?? AccountSelectorScreens.AccountSelector,
  );
  useEffect(() => {
    endTrace({ name: TraceName.AccountList });
  }, []);
  useEffect(() => {
    if (reloadAccounts) {
      dispatch(setReloadAccounts(false));
    }
  }, [dispatch, reloadAccounts]);

  const _onSelectAccount = useCallback(
    (address: string) => {
      Engine.setSelectedAddress(address);
      sheetRef.current?.onCloseBottomSheet();
      onSelectAccount?.(address);

      // Track Event: "Switched Account"
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWITCHED_ACCOUNT)
          .addProperties({
            source: 'Wallet Tab',
            number_of_accounts: accounts?.length,
          })
          .build(),
      );
    },
    [Engine, accounts?.length, onSelectAccount, trackEvent, createEventBuilder],
  );

  const onRemoveImportedAccount = useCallback(
    ({ nextActiveAddress }: { nextActiveAddress: string }) => {
      nextActiveAddress && Engine.setSelectedAddress(nextActiveAddress);
    },
    [Engine],
  );

  const renderAccountSelector = useCallback(
    () => (
      <Fragment>
        <SheetHeader title={strings('accounts.accounts_title')} />
        <AccountSelectorList
          onSelectAccount={_onSelectAccount}
          onRemoveImportedAccount={onRemoveImportedAccount}
          accounts={accounts}
          ensByAccountAddress={ensByAccountAddress}
          isRemoveAccountEnabled
          privacyMode={privacyMode && !disablePrivacyMode}
          testID={AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID}
        />
        <View style={styles.sheet}>
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('account_actions.add_account_or_hardware_wallet')}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            onPress={() => setScreen(AccountSelectorScreens.AddAccountActions)}
            testID={
              AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ADD_BUTTON_ID
            }
          />
        </View>
      </Fragment>
    ),
    [
      accounts,
      _onSelectAccount,
      ensByAccountAddress,
      onRemoveImportedAccount,
      privacyMode,
      disablePrivacyMode,
    ],
  );

  const renderAddAccountActions = useCallback(
    () => (
      <AddAccountActions
        onBack={() => setScreen(AccountSelectorScreens.AccountSelector)}
        onAddHdAccount={() =>
          setScreen(AccountSelectorScreens.AddHdAccountSelector)
        }
      />
    ),
    [],
  );

  const renderAddHdAccountSelector = useCallback(
    () => (
      <AddNewHdAccount
        onBack={() => setScreen(AccountSelectorScreens.AccountSelector)}
      />
    ),
    [],
  );

  const renderAccountScreens = useCallback(() => {
    switch (screen) {
      case AccountSelectorScreens.AccountSelector:
        return renderAccountSelector();
      case AccountSelectorScreens.AddAccountActions:
        return renderAddAccountActions();
      case AccountSelectorScreens.AddHdAccountSelector:
        return renderAddHdAccountSelector();
      default:
        return renderAccountSelector();
    }
  }, [
    screen,
    renderAccountSelector,
    renderAddAccountActions,
    renderAddHdAccountSelector,
  ]);

  return <BottomSheet ref={sheetRef}>{renderAccountScreens()}</BottomSheet>;
};

export default AccountSelector;
