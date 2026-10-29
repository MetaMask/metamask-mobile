import React, { useCallback, useRef, useState } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  ButtonsAlignment,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItemSelect,
  ListItemVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { createNavigationDetails } from '../../../../util/navigation/navUtils';
import { strings } from '../../../../../locales/i18n';
import { selectTokenSortConfig } from '../../../../selectors/preferencesController';
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';
import { DEFAULT_TOKEN_SORT_CONFIG, type SortOrder } from '../util/sortAssets';

const SORT_OPTIONS = [
  {
    id: 'balance',
    key: 'tokenFiatAmount',
    sortCallback: 'stringNumeric',
    defaultOrder: 'dsc',
    labelKey: 'wallet.sort_balance',
    orderLabelKeys: {
      dsc: 'wallet.sort_high_to_low',
      asc: 'wallet.sort_low_to_high',
    },
    testID: WalletViewSelectorsIDs.SORT_DECLINING_BALANCE,
  },
  {
    id: 'name',
    key: 'name',
    sortCallback: 'alphaNumeric',
    defaultOrder: 'asc',
    labelKey: 'wallet.sort_name',
    orderLabelKeys: {
      asc: 'wallet.sort_a_to_z',
      dsc: 'wallet.sort_z_to_a',
    },
    testID: WalletViewSelectorsIDs.SORT_ALPHABETICAL,
  },
] as const;

export const createTokensBottomSheetNavDetails = createNavigationDetails(
  Routes.MODAL.ROOT_MODAL_FLOW,
  Routes.SHEET.TOKEN_SORT,
);

type SortOptionId = (typeof SORT_OPTIONS)[number]['id'];

/** Any sort key other than balance is treated as sorting by name. */
export const getSortOption = (config: { key: string }) =>
  config.key === 'tokenFiatAmount' ? SORT_OPTIONS[0] : SORT_OPTIONS[1];

/**
 * Bottom sheet route to pick the token sort field and direction. Changes stay
 * in a draft until Apply; Reset restores the default sort. Tapping the
 * selected option flips the direction.
 */
export const TokenSortBottomSheet = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const tokenSortConfig = useSelector(selectTokenSortConfig);
  const [draftOptionId, setDraftOptionId] = useState<SortOptionId>(
    getSortOption(tokenSortConfig).id,
  );
  const [draftOrder, setDraftOrder] = useState<SortOrder>(
    tokenSortConfig.order === 'asc' ? 'asc' : 'dsc',
  );
  // ROOT_MODAL_FLOW has no animation, so the opening tap can land on the
  // overlay and dismiss the sheet. Stay non-interactive until fully open.
  const [isReady, setIsReady] = useState(false);

  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleOptionPress = useCallback(
    (option: (typeof SORT_OPTIONS)[number]) => {
      if (draftOptionId === option.id) {
        setDraftOrder((current) => (current === 'asc' ? 'dsc' : 'asc'));
        return;
      }
      setDraftOptionId(option.id);
      setDraftOrder(option.defaultOrder);
    },
    [draftOptionId],
  );

  const handleReset = useCallback(() => {
    const defaultOption = getSortOption(DEFAULT_TOKEN_SORT_CONFIG);
    setDraftOptionId(defaultOption.id);
    setDraftOrder(DEFAULT_TOKEN_SORT_CONFIG.order);
  }, []);

  const handleApply = useCallback(() => {
    const option =
      draftOptionId === SORT_OPTIONS[0].id ? SORT_OPTIONS[0] : SORT_OPTIONS[1];
    Engine.context.PreferencesController.setTokenSortConfig({
      key: option.key,
      order: draftOrder,
      sortCallback: option.sortCallback,
    });
    sheetRef.current?.onCloseBottomSheet();
  }, [draftOptionId, draftOrder]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      onOpen={() => setIsReady(true)}
      isInteractable={isReady}
    >
      <BottomSheetHeader
        onClose={handleClose}
        testID={WalletViewSelectorsIDs.SORT_BY}
      >
        {strings('wallet.sort_by')}
      </BottomSheetHeader>
      {SORT_OPTIONS.map((option) => {
        const isSelected = draftOptionId === option.id;
        return (
          <ListItemSelect
            key={option.id}
            title={strings(option.labelKey)}
            titleProps={{ numberOfLines: 1, ellipsizeMode: 'tail' }}
            variant={ListItemVariant.OneLine}
            isSelected={isSelected}
            showSelectedIcon={false}
            onPress={() => handleOptionPress(option)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            testID={option.testID}
            endAccessory={
              isSelected ? (
                <Box twClassName="flex-row items-center gap-2">
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {strings(option.orderLabelKeys[draftOrder])}
                  </Text>
                  <Icon
                    name={
                      draftOrder === 'asc'
                        ? IconName.Arrow2Up
                        : IconName.Arrow2Down
                    }
                    size={IconSize.Md}
                    color={IconColor.IconAlternative}
                  />
                </Box>
              ) : undefined
            }
          />
        );
      })}
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        primaryButtonProps={{
          children: strings('wallet.sort_apply'),
          onPress: handleApply,
          testID: WalletViewSelectorsIDs.SORT_APPLY,
        }}
        secondaryButtonProps={{
          children: strings('wallet.sort_reset'),
          onPress: handleReset,
          testID: WalletViewSelectorsIDs.SORT_RESET,
        }}
        twClassName="pt-4"
      />
    </BottomSheet>
  );
};
