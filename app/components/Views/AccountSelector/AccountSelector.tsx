// Third party dependencies.
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { InteractionManager, View } from 'react-native';

// External dependencies.
import EvmAccountSelectorList from '../../UI/EvmAccountSelectorList';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Engine from '../../../core/Engine';
import { store } from '../../../store';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { strings } from '../../../../locales/i18n';
import { useAccounts } from '../../hooks/useAccounts';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import AddAccountActions from '../AddAccountActions';
import { AccountListBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { selectPrivacyMode } from '../../../selectors/preferencesController';

// Internal dependencies.
import { useStyles } from '../../../component-library/hooks';
import {
  AccountSelectorProps,
  AccountSelectorScreens,
} from './AccountSelector.types';
import styleSheet from './AccountSelector.styles';
import { useDispatch, useSelector } from 'react-redux';
import { setReloadAccounts } from '../../../actions/accounts';
import { RootState } from '../../../reducers';
import { useMetrics } from '../../../components/hooks/useMetrics';
import {
  TraceName,
  TraceOperation,
  endTrace,
  trace,
} from '../../../util/trace';
import { getTraceTags } from '../../../util/sentry/tags';

const AccountSelector = ({ route }: AccountSelectorProps) => {
  const { styles } = useStyles(styleSheet, {});
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();
  const routeParams = useMemo(() => route?.params, [route?.params]);
  const {
    onSelectAccount,
    checkBalanceError,
    disablePrivacyMode,
    navigateToAddAccountActions,
    // isEvmOnly,
  } = routeParams || {};

  const reloadAccounts = useSelector(
    (state: RootState) => state.accounts.reloadAccounts,
  );
  const privacyMode = useSelector(selectPrivacyMode);
  const sheetRef = useRef<BottomSheetRef>(null);

  // Memoize useAccounts parameters to prevent unnecessary recalculations
  const accountsParams = useMemo(
    () => ({
      checkBalanceError,
      isLoading: reloadAccounts,
    }),
    [checkBalanceError, reloadAccounts],
  );

  // const {
  //   accounts: allAccounts,
  //   ensByAccountAddress,
  //   evmAccounts,
  // } = useAccounts(accountsParams);

  // console.log('allAccounts', JSON.stringify(allAccounts, null, 2));
  // console.log('evmAccounts', JSON.stringify(evmAccounts, null, 2));
  // console.log('isEvmOnly', JSON.stringify(isEvmOnly, null, 2));

  const ensByAccountAddress = [{}];

  const allAccounts = [
    {
      name: 'Account 1',
      address: '0x620A2B5A45b0e4B94F339A22Ff952bB3B346a94f',
      type: 'HD Key Tree',
      yOffset: 0,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x620a2b5a45b0e4b94f339a22ff952bb3b346a94f',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Solana Account 1',
      address: '5s3ViNTSvPrD9YrkRgDFqaBeYQz8bv1VQaJzq6SLVXtV',
      type: 'Snap Keyring',
      yOffset: 78,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 SOL',
      },
      caipAccountId:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:5s3ViNTSvPrD9YrkRgDFqaBeYQz8bv1VQaJzq6SLVXtV',
      scopes: [
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
        'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
      ],
      isLoadingAccount: false,
    },
    {
      name: 'Solana Account 2',
      address: '7rNDaLreKMEDG9vBYPWvjDLX3LU4tEbMPEN6pTxdGVNL',
      type: 'Snap Keyring',
      yOffset: 180,
      isSelected: false,
      assets: {
        fiatBalance: '$16.68\n0.102784909 SOL',
      },
      caipAccountId:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:7rNDaLreKMEDG9vBYPWvjDLX3LU4tEbMPEN6pTxdGVNL',
      scopes: [
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
        'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
      ],
      isLoadingAccount: false,
    },
    {
      name: 'Solana Account 3',
      address: 'CBydi5WTmCFrsr5cSHTAzuTFdHTBqbvg57GVtqW6BCJQ',
      type: 'Snap Keyring',
      yOffset: 282,
      isSelected: false,
      assets: {
        fiatBalance: '$0.14\n0.001 SOL',
      },
      caipAccountId:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:CBydi5WTmCFrsr5cSHTAzuTFdHTBqbvg57GVtqW6BCJQ',
      scopes: [
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
        'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
      ],
      isLoadingAccount: false,
    },
    {
      name: 'Account 2',
      address: '0xC5b2b5ae370876c0122910F92a13bef85A133E56',
      type: 'HD Key Tree',
      yOffset: 384,
      isSelected: true,
      assets: {
        fiatBalance: '$13.96\n0.0015500000000000002 ETH',
      },
      caipAccountId: 'eip155:0:0xc5b2b5ae370876c0122910f92a13bef85a133e56',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 3',
      address: '0x9491938151d774CF46AD422F28B75Ab3364A7240',
      type: 'HD Key Tree',
      yOffset: 462,
      isSelected: false,
      assets: {
        fiatBalance: '$7.91\n0.00327 ETH',
      },
      caipAccountId: 'eip155:0:0x9491938151d774cf46ad422f28b75ab3364a7240',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 4',
      address: '0x79821Ea7aB5c5a34A24b2fd547c544ac15a7b121',
      type: 'HD Key Tree',
      yOffset: 540,
      isSelected: false,
      assets: {
        fiatBalance: '$4.44\n0.00183 ETH',
      },
      caipAccountId: 'eip155:0:0x79821ea7ab5c5a34a24b2fd547c544ac15a7b121',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 5',
      address: '0xdf8C8269f35274c5Ba5c18f091407C8b1c29D7b1',
      type: 'HD Key Tree',
      yOffset: 618,
      isSelected: false,
      assets: {
        fiatBalance: '$127.90\n0.052750000000000005 ETH',
      },
      caipAccountId: 'eip155:0:0xdf8c8269f35274c5ba5c18f091407c8b1c29d7b1',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 6',
      address: '0x5Ea510E7E1d3B3d4Ec9E0615893B6552479B9d52',
      type: 'HD Key Tree',
      yOffset: 696,
      isSelected: false,
      assets: {
        fiatBalance: '$0.28\n0.00012 ETH',
      },
      caipAccountId: 'eip155:0:0x5ea510e7e1d3b3d4ec9e0615893b6552479b9d52',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 7',
      address: '0x28f9C91eF587099460642Ac1ad9785aA711B98AD',
      type: 'HD Key Tree',
      yOffset: 774,
      isSelected: false,
      assets: {
        fiatBalance: '$2.42\n0.001 ETH',
      },
      caipAccountId: 'eip155:0:0x28f9c91ef587099460642ac1ad9785aa711b98ad',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 8',
      address: '0x194Cca48fE7Eb9e1786eA15F6BD2674C38B1827e',
      type: 'HD Key Tree',
      yOffset: 852,
      isSelected: false,
      assets: {
        fiatBalance: '$2.08\n0.00086 ETH',
      },
      caipAccountId: 'eip155:0:0x194cca48fe7eb9e1786ea15f6bd2674c38b1827e',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 9',
      address: '0x589dB4AAE3ae475E1C4c2Dc0bbFf5E81CdF654E0',
      type: 'HD Key Tree',
      yOffset: 930,
      isSelected: false,
      assets: {
        fiatBalance: '$0.19\n0.00008 ETH',
      },
      caipAccountId: 'eip155:0:0x589db4aae3ae475e1c4c2dc0bbff5e81cdf654e0',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 10',
      address: '0xccfBfa2388B1c1FEaB35C02158aFE88fC5eAC53c',
      type: 'HD Key Tree',
      yOffset: 1008,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xccfbfa2388b1c1feab35c02158afe88fc5eac53c',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 11',
      address: '0x1281Ba5D0E59f38F0747f8E4E610B172bBdd9050',
      type: 'HD Key Tree',
      yOffset: 1086,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x1281ba5d0e59f38f0747f8e4e610b172bbdd9050',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 12',
      address: '0x373A1687eD98F2fea570A5a22126f436a02d92D8',
      type: 'HD Key Tree',
      yOffset: 1164,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x373a1687ed98f2fea570a5a22126f436a02d92d8',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: '56456456464564564564',
      address: '0x9807B2Ed2CcC3DE0122F92185f9F5700C0b82Cbd',
      type: 'HD Key Tree',
      yOffset: 1242,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x9807b2ed2ccc3de0122f92185f9f5700c0b82cbd',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 14',
      address: '0xD24D5F6145b6d763690552Cc16CfB0A51A1a0701',
      type: 'HD Key Tree',
      yOffset: 1320,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xd24d5f6145b6d763690552cc16cfb0a51a1a0701',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 15',
      address: '0xfF9596512ca21DaAC47B20fF4a8F57e9919790Eb',
      type: 'HD Key Tree',
      yOffset: 1398,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xff9596512ca21daac47b20ff4a8f57e9919790eb',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 16',
      address: '0xe952fdb3Fd59c31F320abCE8800DBB46E9025Ace',
      type: 'HD Key Tree',
      yOffset: 1476,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xe952fdb3fd59c31f320abce8800dbb46e9025ace',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 17',
      address: '0x4a425F2412187faA763bA0a1356Ba73a48020047',
      type: 'HD Key Tree',
      yOffset: 1554,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x4a425f2412187faa763ba0a1356ba73a48020047',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 18',
      address: '0xc4c5165B1CE8a6261b8c9A90BE13298ea28fC082',
      type: 'HD Key Tree',
      yOffset: 1632,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xc4c5165b1ce8a6261b8c9a90be13298ea28fc082',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 19',
      address: '0x9339B1D5ed9b127479fD742bf7501CE2f5223C37',
      type: 'HD Key Tree',
      yOffset: 1710,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x9339b1d5ed9b127479fd742bf7501ce2f5223c37',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 20',
      address: '0x4Cd212C7F843c8898e98277D694c1beFEb399f34',
      type: 'HD Key Tree',
      yOffset: 1788,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x4cd212c7f843c8898e98277d694c1befeb399f34',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 21',
      address: '0xDF80586B7bD9e7fFE2FC684eAA581569e0E33437',
      type: 'HD Key Tree',
      yOffset: 1866,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xdf80586b7bd9e7ffe2fc684eaa581569e0e33437',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 22',
      address: '0xAdF2f6111caaee7B3045d0bA06727715D74a9CFb',
      type: 'HD Key Tree',
      yOffset: 1944,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xadf2f6111caaee7b3045d0ba06727715d74a9cfb',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 23',
      address: '0xeA74A6cB02A434aC699b55379eac62cD8E3Df6a7',
      type: 'HD Key Tree',
      yOffset: 2022,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xea74a6cb02a434ac699b55379eac62cd8e3df6a7',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 24',
      address: '0x03Ae96f8cAB1C5979c7b43cD49dF2861E21D9C92',
      type: 'HD Key Tree',
      yOffset: 2100,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x03ae96f8cab1c5979c7b43cd49df2861e21d9c92',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 25',
      address: '0x5aaB249Ee5BD42c96574fbf1aDdC3E0a35436B2c',
      type: 'HD Key Tree',
      yOffset: 2178,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x5aab249ee5bd42c96574fbf1addc3e0a35436b2c',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 26',
      address: '0xB78a17dCFC0C0347d4927919D70465D6A712f80B',
      type: 'HD Key Tree',
      yOffset: 2256,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xb78a17dcfc0c0347d4927919d70465d6a712f80b',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 27',
      address: '0x59e6461A60686440f4a37B075D5e8f7f2839Bd87',
      type: 'HD Key Tree',
      yOffset: 2334,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x59e6461a60686440f4a37b075d5e8f7f2839bd87',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 28',
      address: '0x0E02d1b94B179A05D4d266993e4464525F09b022',
      type: 'HD Key Tree',
      yOffset: 2412,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x0e02d1b94b179a05d4d266993e4464525f09b022',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 29',
      address: '0x0ec91f0fA116b9980f71B7eAe3FF2B96F72fD055',
      type: 'HD Key Tree',
      yOffset: 2490,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x0ec91f0fa116b9980f71b7eae3ff2b96f72fd055',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 30',
      address: '0xB298E7878B6879AAd704eA5D0BA85db6B2fBee3a',
      type: 'HD Key Tree',
      yOffset: 2568,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xb298e7878b6879aad704ea5d0ba85db6b2fbee3a',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 31',
      address: '0xC86d33A0eD9Abf940c73f767Eecb1Bb23451F698',
      type: 'HD Key Tree',
      yOffset: 2646,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xc86d33a0ed9abf940c73f767eecb1bb23451f698',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 32',
      address: '0xE9D2A254AF0e570BA0C76250a81Ae9C0878c1CBe',
      type: 'HD Key Tree',
      yOffset: 2724,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xe9d2a254af0e570ba0c76250a81ae9c0878c1cbe',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 33',
      address: '0x773B06926FA060F3B4504c6f2A007731400461CC',
      type: 'HD Key Tree',
      yOffset: 2802,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x773b06926fa060f3b4504c6f2a007731400461cc',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 34',
      address: '0xBC3665A27aD1BDD6728Eb196F60eB8424fFDe073',
      type: 'HD Key Tree',
      yOffset: 2880,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xbc3665a27ad1bdd6728eb196f60eb8424ffde073',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 35',
      address: '0x25A5649b71E0bAd610d6f68a626E0F735F9ED791',
      type: 'HD Key Tree',
      yOffset: 2958,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x25a5649b71e0bad610d6f68a626e0f735f9ed791',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 36',
      address: '0x2125dAa262F52B850fcF045524a682462377C0a4',
      type: 'HD Key Tree',
      yOffset: 3036,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x2125daa262f52b850fcf045524a682462377c0a4',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 37',
      address: '0xB07dF07a94F3d530cDBf331561CD785909b4564b',
      type: 'HD Key Tree',
      yOffset: 3114,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xb07df07a94f3d530cdbf331561cd785909b4564b',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 38',
      address: '0xF48D1174972eB8866Ae7925953Ceb9F3e70246f5',
      type: 'HD Key Tree',
      yOffset: 3192,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xf48d1174972eb8866ae7925953ceb9f3e70246f5',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 39',
      address: '0x7287e8e218d15da2eC12C1325F46d3d354431f5f',
      type: 'HD Key Tree',
      yOffset: 3270,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x7287e8e218d15da2ec12c1325f46d3d354431f5f',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 40',
      address: '0xe47422eAe6C8F7fa1D9Ba2c0BB9DEB39458ee045',
      type: 'HD Key Tree',
      yOffset: 3348,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xe47422eae6c8f7fa1d9ba2c0bb9deb39458ee045',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 41',
      address: '0x9634daAd317fB589b6A313C8085f81C0bF6D109A',
      type: 'HD Key Tree',
      yOffset: 3426,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x9634daad317fb589b6a313c8085f81c0bf6d109a',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 42',
      address: '0xf60FF2312A2f346a61F63Ef44440e269cbB0d7b2',
      type: 'HD Key Tree',
      yOffset: 3504,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xf60ff2312a2f346a61f63ef44440e269cbb0d7b2',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 43',
      address: '0x5Dc02165537aAb32Da3FD182185D68DF30C66e0b',
      type: 'HD Key Tree',
      yOffset: 3582,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x5dc02165537aab32da3fd182185d68df30c66e0b',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 44',
      address: '0xbF0BdF4f87496D6732bF192E9FC4C9D9Ccd7fEe4',
      type: 'HD Key Tree',
      yOffset: 3660,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xbf0bdf4f87496d6732bf192e9fc4c9d9ccd7fee4',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 45',
      address: '0x6c60DDB32f1A5Ba2f933B4202B2Ee685e6Ee1f12',
      type: 'HD Key Tree',
      yOffset: 3738,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x6c60ddb32f1a5ba2f933b4202b2ee685e6ee1f12',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 46',
      address: '0x330C23c6ab808ce79561bbDAFcd5C4f80c6D4f42',
      type: 'HD Key Tree',
      yOffset: 3816,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x330c23c6ab808ce79561bbdafcd5c4f80c6d4f42',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 47',
      address: '0xF5fE08FA1591b9972D7FaE3F632cdF26e76Fc7Db',
      type: 'HD Key Tree',
      yOffset: 3894,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xf5fe08fa1591b9972d7fae3f632cdf26e76fc7db',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 48',
      address: '0xe4937909CEE92f938985A5Cdc9eE51DbF69242Ce',
      type: 'HD Key Tree',
      yOffset: 3972,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xe4937909cee92f938985a5cdc9ee51dbf69242ce',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 49',
      address: '0xF78d7DB0F15e5965ACD9C60C8402fF93315cBd9A',
      type: 'HD Key Tree',
      yOffset: 4050,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xf78d7db0f15e5965acd9c60c8402ff93315cbd9a',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 50',
      address: '0x253FDEB3d973Ab6Dd16AF0d5Eb693a5C95c902D0',
      type: 'HD Key Tree',
      yOffset: 4128,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x253fdeb3d973ab6dd16af0d5eb693a5c95c902d0',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 51',
      address: '0x7bd9D92c4926D474BA07c17Bf02d8810AD639B68',
      type: 'HD Key Tree',
      yOffset: 4206,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x7bd9d92c4926d474ba07c17bf02d8810ad639b68',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 52',
      address: '0x2A2a4453ebD3e58cC83896698571959a7111C575',
      type: 'HD Key Tree',
      yOffset: 4284,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x2a2a4453ebd3e58cc83896698571959a7111c575',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 53',
      address: '0xfaC0b9E46d521B395d2df97B114817d6815894a3',
      type: 'HD Key Tree',
      yOffset: 4362,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xfac0b9e46d521b395d2df97b114817d6815894a3',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 54',
      address: '0xCdf9a9892fc99c8D42C723f2c6A55C57071a6B67',
      type: 'HD Key Tree',
      yOffset: 4440,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xcdf9a9892fc99c8d42c723f2c6a55c57071a6b67',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 55',
      address: '0x1825C0Da3fBc40f09bA999951f398d980Ef1895E',
      type: 'HD Key Tree',
      yOffset: 4518,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x1825c0da3fbc40f09ba999951f398d980ef1895e',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 56',
      address: '0x2e45EAdCB930C8C75348c39b94e339E7051EFeEb',
      type: 'HD Key Tree',
      yOffset: 4596,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x2e45eadcb930c8c75348c39b94e339e7051efeeb',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 57',
      address: '0x5E282427129E67B7FbcFE53e74367700f01AF40c',
      type: 'HD Key Tree',
      yOffset: 4674,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x5e282427129e67b7fbcfe53e74367700f01af40c',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 58',
      address: '0x76b28932fE3835D770891b102Ef15CDD71354F16',
      type: 'HD Key Tree',
      yOffset: 4752,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x76b28932fe3835d770891b102ef15cdd71354f16',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
  ];
  const evmAccounts = [
    {
      name: 'Account 1',
      address: '0x620A2B5A45b0e4B94F339A22Ff952bB3B346a94f',
      type: 'HD Key Tree',
      yOffset: 0,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x620a2b5a45b0e4b94f339a22ff952bb3b346a94f',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 2',
      address: '0xC5b2b5ae370876c0122910F92a13bef85A133E56',
      type: 'HD Key Tree',
      yOffset: 384,
      isSelected: true,
      assets: {
        fiatBalance: '$13.96\n0.0015500000000000002 ETH',
      },
      caipAccountId: 'eip155:0:0xc5b2b5ae370876c0122910f92a13bef85a133e56',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 3',
      address: '0x9491938151d774CF46AD422F28B75Ab3364A7240',
      type: 'HD Key Tree',
      yOffset: 462,
      isSelected: false,
      assets: {
        fiatBalance: '$7.91\n0.00327 ETH',
      },
      caipAccountId: 'eip155:0:0x9491938151d774cf46ad422f28b75ab3364a7240',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 4',
      address: '0x79821Ea7aB5c5a34A24b2fd547c544ac15a7b121',
      type: 'HD Key Tree',
      yOffset: 540,
      isSelected: false,
      assets: {
        fiatBalance: '$4.44\n0.00183 ETH',
      },
      caipAccountId: 'eip155:0:0x79821ea7ab5c5a34a24b2fd547c544ac15a7b121',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 5',
      address: '0xdf8C8269f35274c5Ba5c18f091407C8b1c29D7b1',
      type: 'HD Key Tree',
      yOffset: 618,
      isSelected: false,
      assets: {
        fiatBalance: '$127.90\n0.052750000000000005 ETH',
      },
      caipAccountId: 'eip155:0:0xdf8c8269f35274c5ba5c18f091407c8b1c29d7b1',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 6',
      address: '0x5Ea510E7E1d3B3d4Ec9E0615893B6552479B9d52',
      type: 'HD Key Tree',
      yOffset: 696,
      isSelected: false,
      assets: {
        fiatBalance: '$0.28\n0.00012 ETH',
      },
      caipAccountId: 'eip155:0:0x5ea510e7e1d3b3d4ec9e0615893b6552479b9d52',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 7',
      address: '0x28f9C91eF587099460642Ac1ad9785aA711B98AD',
      type: 'HD Key Tree',
      yOffset: 774,
      isSelected: false,
      assets: {
        fiatBalance: '$2.42\n0.001 ETH',
      },
      caipAccountId: 'eip155:0:0x28f9c91ef587099460642ac1ad9785aa711b98ad',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 8',
      address: '0x194Cca48fE7Eb9e1786eA15F6BD2674C38B1827e',
      type: 'HD Key Tree',
      yOffset: 852,
      isSelected: false,
      assets: {
        fiatBalance: '$2.08\n0.00086 ETH',
      },
      caipAccountId: 'eip155:0:0x194cca48fe7eb9e1786ea15f6bd2674c38b1827e',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 9',
      address: '0x589dB4AAE3ae475E1C4c2Dc0bbFf5E81CdF654E0',
      type: 'HD Key Tree',
      yOffset: 930,
      isSelected: false,
      assets: {
        fiatBalance: '$0.19\n0.00008 ETH',
      },
      caipAccountId: 'eip155:0:0x589db4aae3ae475e1c4c2dc0bbff5e81cdf654e0',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 10',
      address: '0xccfBfa2388B1c1FEaB35C02158aFE88fC5eAC53c',
      type: 'HD Key Tree',
      yOffset: 1008,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xccfbfa2388b1c1feab35c02158afe88fc5eac53c',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 11',
      address: '0x1281Ba5D0E59f38F0747f8E4E610B172bBdd9050',
      type: 'HD Key Tree',
      yOffset: 1086,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x1281ba5d0e59f38f0747f8e4e610b172bbdd9050',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 12',
      address: '0x373A1687eD98F2fea570A5a22126f436a02d92D8',
      type: 'HD Key Tree',
      yOffset: 1164,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x373a1687ed98f2fea570a5a22126f436a02d92d8',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: '56456456464564564564',
      address: '0x9807B2Ed2CcC3DE0122F92185f9F5700C0b82Cbd',
      type: 'HD Key Tree',
      yOffset: 1242,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x9807b2ed2ccc3de0122f92185f9f5700c0b82cbd',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 14',
      address: '0xD24D5F6145b6d763690552Cc16CfB0A51A1a0701',
      type: 'HD Key Tree',
      yOffset: 1320,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xd24d5f6145b6d763690552cc16cfb0a51a1a0701',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 15',
      address: '0xfF9596512ca21DaAC47B20fF4a8F57e9919790Eb',
      type: 'HD Key Tree',
      yOffset: 1398,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xff9596512ca21daac47b20ff4a8f57e9919790eb',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 16',
      address: '0xe952fdb3Fd59c31F320abCE8800DBB46E9025Ace',
      type: 'HD Key Tree',
      yOffset: 1476,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xe952fdb3fd59c31f320abce8800dbb46e9025ace',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 17',
      address: '0x4a425F2412187faA763bA0a1356Ba73a48020047',
      type: 'HD Key Tree',
      yOffset: 1554,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x4a425f2412187faa763ba0a1356ba73a48020047',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 18',
      address: '0xc4c5165B1CE8a6261b8c9A90BE13298ea28fC082',
      type: 'HD Key Tree',
      yOffset: 1632,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xc4c5165b1ce8a6261b8c9a90be13298ea28fc082',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 19',
      address: '0x9339B1D5ed9b127479fD742bf7501CE2f5223C37',
      type: 'HD Key Tree',
      yOffset: 1710,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x9339b1d5ed9b127479fd742bf7501ce2f5223c37',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 20',
      address: '0x4Cd212C7F843c8898e98277D694c1beFEb399f34',
      type: 'HD Key Tree',
      yOffset: 1788,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x4cd212c7f843c8898e98277d694c1befeb399f34',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 21',
      address: '0xDF80586B7bD9e7fFE2FC684eAA581569e0E33437',
      type: 'HD Key Tree',
      yOffset: 1866,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xdf80586b7bd9e7ffe2fc684eaa581569e0e33437',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 22',
      address: '0xAdF2f6111caaee7B3045d0bA06727715D74a9CFb',
      type: 'HD Key Tree',
      yOffset: 1944,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xadf2f6111caaee7b3045d0ba06727715d74a9cfb',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 23',
      address: '0xeA74A6cB02A434aC699b55379eac62cD8E3Df6a7',
      type: 'HD Key Tree',
      yOffset: 2022,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xea74a6cb02a434ac699b55379eac62cd8e3df6a7',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 24',
      address: '0x03Ae96f8cAB1C5979c7b43cD49dF2861E21D9C92',
      type: 'HD Key Tree',
      yOffset: 2100,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x03ae96f8cab1c5979c7b43cd49df2861e21d9c92',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 25',
      address: '0x5aaB249Ee5BD42c96574fbf1aDdC3E0a35436B2c',
      type: 'HD Key Tree',
      yOffset: 2178,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x5aab249ee5bd42c96574fbf1addc3e0a35436b2c',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 26',
      address: '0xB78a17dCFC0C0347d4927919D70465D6A712f80B',
      type: 'HD Key Tree',
      yOffset: 2256,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xb78a17dcfc0c0347d4927919d70465d6a712f80b',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 27',
      address: '0x59e6461A60686440f4a37B075D5e8f7f2839Bd87',
      type: 'HD Key Tree',
      yOffset: 2334,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x59e6461a60686440f4a37b075d5e8f7f2839bd87',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 28',
      address: '0x0E02d1b94B179A05D4d266993e4464525F09b022',
      type: 'HD Key Tree',
      yOffset: 2412,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x0e02d1b94b179a05d4d266993e4464525f09b022',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 29',
      address: '0x0ec91f0fA116b9980f71B7eAe3FF2B96F72fD055',
      type: 'HD Key Tree',
      yOffset: 2490,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x0ec91f0fa116b9980f71b7eae3ff2b96f72fd055',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 30',
      address: '0xB298E7878B6879AAd704eA5D0BA85db6B2fBee3a',
      type: 'HD Key Tree',
      yOffset: 2568,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xb298e7878b6879aad704ea5d0ba85db6b2fbee3a',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 31',
      address: '0xC86d33A0eD9Abf940c73f767Eecb1Bb23451F698',
      type: 'HD Key Tree',
      yOffset: 2646,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xc86d33a0ed9abf940c73f767eecb1bb23451f698',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 32',
      address: '0xE9D2A254AF0e570BA0C76250a81Ae9C0878c1CBe',
      type: 'HD Key Tree',
      yOffset: 2724,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xe9d2a254af0e570ba0c76250a81ae9c0878c1cbe',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 33',
      address: '0x773B06926FA060F3B4504c6f2A007731400461CC',
      type: 'HD Key Tree',
      yOffset: 2802,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x773b06926fa060f3b4504c6f2a007731400461cc',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 34',
      address: '0xBC3665A27aD1BDD6728Eb196F60eB8424fFDe073',
      type: 'HD Key Tree',
      yOffset: 2880,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xbc3665a27ad1bdd6728eb196f60eb8424ffde073',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 35',
      address: '0x25A5649b71E0bAd610d6f68a626E0F735F9ED791',
      type: 'HD Key Tree',
      yOffset: 2958,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x25a5649b71e0bad610d6f68a626e0f735f9ed791',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 36',
      address: '0x2125dAa262F52B850fcF045524a682462377C0a4',
      type: 'HD Key Tree',
      yOffset: 3036,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x2125daa262f52b850fcf045524a682462377c0a4',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 37',
      address: '0xB07dF07a94F3d530cDBf331561CD785909b4564b',
      type: 'HD Key Tree',
      yOffset: 3114,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xb07df07a94f3d530cdbf331561cd785909b4564b',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 38',
      address: '0xF48D1174972eB8866Ae7925953Ceb9F3e70246f5',
      type: 'HD Key Tree',
      yOffset: 3192,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xf48d1174972eb8866ae7925953ceb9f3e70246f5',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 39',
      address: '0x7287e8e218d15da2eC12C1325F46d3d354431f5f',
      type: 'HD Key Tree',
      yOffset: 3270,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x7287e8e218d15da2ec12c1325f46d3d354431f5f',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 40',
      address: '0xe47422eAe6C8F7fa1D9Ba2c0BB9DEB39458ee045',
      type: 'HD Key Tree',
      yOffset: 3348,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xe47422eae6c8f7fa1d9ba2c0bb9deb39458ee045',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 41',
      address: '0x9634daAd317fB589b6A313C8085f81C0bF6D109A',
      type: 'HD Key Tree',
      yOffset: 3426,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x9634daad317fb589b6a313c8085f81c0bf6d109a',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 42',
      address: '0xf60FF2312A2f346a61F63Ef44440e269cbB0d7b2',
      type: 'HD Key Tree',
      yOffset: 3504,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xf60ff2312a2f346a61f63ef44440e269cbb0d7b2',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 43',
      address: '0x5Dc02165537aAb32Da3FD182185D68DF30C66e0b',
      type: 'HD Key Tree',
      yOffset: 3582,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x5dc02165537aab32da3fd182185d68df30c66e0b',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 44',
      address: '0xbF0BdF4f87496D6732bF192E9FC4C9D9Ccd7fEe4',
      type: 'HD Key Tree',
      yOffset: 3660,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xbf0bdf4f87496d6732bf192e9fc4c9d9ccd7fee4',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 45',
      address: '0x6c60DDB32f1A5Ba2f933B4202B2Ee685e6Ee1f12',
      type: 'HD Key Tree',
      yOffset: 3738,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x6c60ddb32f1a5ba2f933b4202b2ee685e6ee1f12',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 46',
      address: '0x330C23c6ab808ce79561bbDAFcd5C4f80c6D4f42',
      type: 'HD Key Tree',
      yOffset: 3816,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x330c23c6ab808ce79561bbdafcd5c4f80c6d4f42',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 47',
      address: '0xF5fE08FA1591b9972D7FaE3F632cdF26e76Fc7Db',
      type: 'HD Key Tree',
      yOffset: 3894,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xf5fe08fa1591b9972d7fae3f632cdf26e76fc7db',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 48',
      address: '0xe4937909CEE92f938985A5Cdc9eE51DbF69242Ce',
      type: 'HD Key Tree',
      yOffset: 3972,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xe4937909cee92f938985a5cdc9ee51dbf69242ce',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 49',
      address: '0xF78d7DB0F15e5965ACD9C60C8402fF93315cBd9A',
      type: 'HD Key Tree',
      yOffset: 4050,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xf78d7db0f15e5965acd9c60c8402ff93315cbd9a',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 50',
      address: '0x253FDEB3d973Ab6Dd16AF0d5Eb693a5C95c902D0',
      type: 'HD Key Tree',
      yOffset: 4128,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x253fdeb3d973ab6dd16af0d5eb693a5c95c902d0',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 51',
      address: '0x7bd9D92c4926D474BA07c17Bf02d8810AD639B68',
      type: 'HD Key Tree',
      yOffset: 4206,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x7bd9d92c4926d474ba07c17bf02d8810ad639b68',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 52',
      address: '0x2A2a4453ebD3e58cC83896698571959a7111C575',
      type: 'HD Key Tree',
      yOffset: 4284,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x2a2a4453ebd3e58cc83896698571959a7111c575',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 53',
      address: '0xfaC0b9E46d521B395d2df97B114817d6815894a3',
      type: 'HD Key Tree',
      yOffset: 4362,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xfac0b9e46d521b395d2df97b114817d6815894a3',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 54',
      address: '0xCdf9a9892fc99c8D42C723f2c6A55C57071a6B67',
      type: 'HD Key Tree',
      yOffset: 4440,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0xcdf9a9892fc99c8d42c723f2c6a55c57071a6b67',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 55',
      address: '0x1825C0Da3fBc40f09bA999951f398d980Ef1895E',
      type: 'HD Key Tree',
      yOffset: 4518,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x1825c0da3fbc40f09ba999951f398d980ef1895e',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 56',
      address: '0x2e45EAdCB930C8C75348c39b94e339E7051EFeEb',
      type: 'HD Key Tree',
      yOffset: 4596,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x2e45eadcb930c8c75348c39b94e339e7051efeeb',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 57',
      address: '0x5E282427129E67B7FbcFE53e74367700f01AF40c',
      type: 'HD Key Tree',
      yOffset: 4674,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x5e282427129e67b7fbcfe53e74367700f01af40c',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
    {
      name: 'Account 58',
      address: '0x76b28932fE3835D770891b102Ef15CDD71354F16',
      type: 'HD Key Tree',
      yOffset: 4752,
      isSelected: false,
      assets: {
        fiatBalance: '$0.00\n0 ETH',
      },
      caipAccountId: 'eip155:0:0x76b28932fe3835d770891b102ef15cdd71354f16',
      scopes: ['eip155:0'],
      isLoadingAccount: false,
    },
  ];
  const isEvmOnly = undefined;

  const accounts = isEvmOnly ? evmAccounts : allAccounts;

  const [screen, setScreen] = useState<AccountSelectorScreens>(
    () => navigateToAddAccountActions ?? AccountSelectorScreens.AccountSelector,
  );
  useEffect(() => {
    if (reloadAccounts) {
      dispatch(setReloadAccounts(false));
    }
  }, [dispatch, reloadAccounts]);

  const _onSelectAccount = useCallback(
    (address: string) => {
      InteractionManager.runAfterInteractions(() => {
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
      });
    },
    [accounts?.length, onSelectAccount, trackEvent, createEventBuilder],
  );

  // Handler for adding accounts
  const handleAddAccount = useCallback(() => {
    setScreen(AccountSelectorScreens.AddAccountActions);
  }, []);

  // Handler for returning from add accounts screen
  const handleBackToSelector = useCallback(() => {
    setScreen(AccountSelectorScreens.AccountSelector);
  }, []);

  const onRemoveImportedAccount = useCallback(
    ({ nextActiveAddress }: { nextActiveAddress: string }) => {
      nextActiveAddress && Engine.setSelectedAddress(nextActiveAddress);
    },
    [],
  );

  // Tracing for the account list rendering:
  const isAccountSelector = useMemo(
    () => screen === AccountSelectorScreens.AccountSelector,
    [screen],
  );
  useEffect(() => {
    if (isAccountSelector) {
      trace({
        name: TraceName.AccountList,
        op: TraceOperation.AccountList,
        tags: getTraceTags(store.getState()),
      });
    }
  }, [isAccountSelector]);
  // We want to track the full render of the account list, meaning when the full animation is done, so
  // we hook the open animation and end the trace there.
  const onOpen = useCallback(() => {
    if (isAccountSelector) {
      endTrace({
        name: TraceName.AccountList,
      });
    }
  }, [isAccountSelector]);

  const renderAccountSelector = useCallback(
    () => (
      <Fragment>
        <SheetHeader title={strings('accounts.accounts_title')} />
        <EvmAccountSelectorList
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
            onPress={handleAddAccount}
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
      handleAddAccount,
      styles.sheet,
    ],
  );

  const renderAddAccountActions = useCallback(
    () => <AddAccountActions onBack={handleBackToSelector} />,
    [handleBackToSelector],
  );

  const renderAccountScreens = useCallback(() => {
    switch (screen) {
      case AccountSelectorScreens.AccountSelector:
        return renderAccountSelector();
      case AccountSelectorScreens.AddAccountActions:
        return renderAddAccountActions();
      default:
        return renderAccountSelector();
    }
  }, [screen, renderAccountSelector, renderAddAccountActions]);

  return (
    <BottomSheet
      style={styles.bottomSheetContent}
      ref={sheetRef}
      onOpen={onOpen}
    >
      {renderAccountScreens()}
    </BottomSheet>
  );
};

export default React.memo(AccountSelector);
