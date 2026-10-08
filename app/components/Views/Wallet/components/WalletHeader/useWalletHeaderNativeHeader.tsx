import React, { useCallback, useMemo } from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import type { NativeStackHeaderItem } from '@react-navigation/native-stack';
import PickerAccount from '../../../../../component-library/components/Pickers/PickerAccount';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { createAccountSelectorNavDetails } from '../../../AccountSelector';
import { useNativeHeader } from '../../../../hooks/useNativeHeader';
import WalletHeaderInterimActions from './WalletHeaderInterimActions';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';

const INTERIM_ACCOUNT_NAME_MAX_CHARS = 12;

export const INTERIM_ACCOUNT_PICKER_CLASS = 'bg-transparent px-3 py-0';

export const formatInterimAccountName = (displayName: string): string => {
  // Array.from splits by code point so an emoji is never cut in half.
  const chars = Array.from(displayName);
  return chars.length > INTERIM_ACCOUNT_NAME_MAX_CHARS
    ? `${chars.slice(0, INTERIM_ACCOUNT_NAME_MAX_CHARS).join('')}...`
    : displayName;
};

interface TouchAreaSlop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface WalletHeaderNativeHeaderParams {
  displayName: string;
  isMoneyAccountVisible: boolean;
  handleActivityPress: () => void;
  handleSearchPress: () => void;
  handleHamburgerPress: () => void;
  touchAreaSlop: TouchAreaSlop;
  isEnabled: boolean;
}

/**
 * The interim wallet header as a native iOS 26 bar: the account picker on the
 * left, Activity, Search and Menu grouped on the right. Returns whether the
 * native bar is on, so the caller skips the JS `WalletHeader`.
 */
export const useWalletHeaderNativeHeader = ({
  displayName,
  isMoneyAccountVisible,
  handleActivityPress,
  handleSearchPress,
  handleHamburgerPress,
  touchAreaSlop,
  isEnabled,
}: WalletHeaderNativeHeaderParams): boolean => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const tw = useTailwind();
  // Memoized so the header items keep a stable identity.
  const accountPickerStyle = useMemo(
    () => tw.style(INTERIM_ACCOUNT_PICKER_CLASS),
    [tw],
  );

  const handleAccountPickerPress = useCallback(() => {
    navigation.navigate(...createAccountSelectorNavDetails({}));
  }, [navigation]);

  const leftItems = useCallback(
    (): NativeStackHeaderItem[] => [
      {
        type: 'custom',
        element: (
          <PickerAccount
            accountName={formatInterimAccountName(displayName)}
            onPress={handleAccountPickerPress}
            testID={WalletViewSelectorsIDs.ACCOUNT_ICON}
            hitSlop={touchAreaSlop}
            style={accountPickerStyle}
          />
        ),
      },
    ],
    [accountPickerStyle, displayName, handleAccountPickerPress, touchAreaSlop],
  );

  // One custom item, so our spacing applies; UIKit still draws the glass
  // capsule behind it. Separate native buttons get the system's wider spacing.
  const rightItems = useCallback(
    (): NativeStackHeaderItem[] => [
      {
        type: 'custom',
        element: (
          <WalletHeaderInterimActions
            isMoneyAccountVisible={isMoneyAccountVisible}
            handleActivityPress={handleActivityPress}
            handleSearchPress={handleSearchPress}
            handleHamburgerPress={handleHamburgerPress}
            touchAreaSlop={touchAreaSlop}
            twClassName="px-1"
          />
        ),
      },
    ],
    [
      handleActivityPress,
      handleHamburgerPress,
      handleSearchPress,
      isMoneyAccountVisible,
      touchAreaSlop,
    ],
  );

  return useNativeHeader({ leftItems, rightItems, isEnabled });
};
