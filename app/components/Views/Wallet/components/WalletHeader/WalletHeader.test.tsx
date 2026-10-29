import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import WalletHeader, { type WalletHeaderProps } from './WalletHeader';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';
import { useAccountsMenuAttention } from '../../../../hooks/useAccountsMenuAttention';
import { useLiquidGlass } from '../../../../../component-library/hooks/useLiquidGlass';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('../../../../UI/AddressCopy', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID: string }) => <View testID={testID} />,
  };
});

jest.mock('../../../../UI/Card/components/CardButton', () => {
  const { View } = jest.requireActual('react-native');
  const { WalletViewSelectorsIDs: TestIds } = jest.requireActual(
    '../../WalletView.testIds',
  );
  return {
    __esModule: true,
    default: ({ onPress }: { onPress: () => void }) => (
      <View testID={TestIds.CARD_BUTTON} onTouchEnd={onPress} />
    ),
  };
});

jest.mock('../../../../hooks/useAccountsMenuAttention', () => ({
  useAccountsMenuAttention: jest.fn(() => false),
}));

let mockSocialV1Enabled = false;
jest.mock('../../../../../selectors/featureFlagController/socialV1', () => ({
  selectIsSocialV1Enabled: jest.fn(() => mockSocialV1Enabled),
}));

const mockWalletHeaderProfileAvatar = jest.fn();
jest.mock('./WalletHeaderProfileAvatar', () => {
  const { View } = jest.requireActual('react-native');
  const { WalletViewSelectorsIDs: TestIds } = jest.requireActual(
    '../../WalletView.testIds',
  );
  return {
    __esModule: true,
    SOCIAL_HEADER_PROFILE_AVATAR_DIAMETER: 40,
    default: (props: { diameter?: number }) => {
      mockWalletHeaderProfileAvatar(props);
      return <View testID={TestIds.ACCOUNT_PICKER_AVATAR} />;
    },
  };
});

const mockBlurView = jest.fn();
jest.mock('expo-blur', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BlurView: (props: Record<string, unknown>) => {
      mockBlurView(props);
      return ReactActual.createElement(View, props);
    },
  };
});

const noGlass = {
  isGlassEnabled: false,
  glassColorScheme: 'light' as const,
  isBlurEnabled: false,
  blurTint: 'systemChromeMaterialLight' as const,
};

jest.mock('../../../../../component-library/hooks/useLiquidGlass', () => ({
  useLiquidGlass: jest.fn(() => ({
    isGlassEnabled: false,
    glassColorScheme: 'light',
    isBlurEnabled: false,
    blurTint: 'systemChromeMaterialLight',
  })),
}));

const touchAreaSlop = { top: 8, bottom: 8, left: 8, right: 8 };

const defaultProps: WalletHeaderProps = {
  displayName: 'Account 1',
  navigation: {},
  isMoneyAccountVisible: false,
  handleSearchPress: jest.fn(),
  useSearchHeaderLayout: true,
  showSearchPastePill: false,
  handleSearchPastePress: jest.fn(),
  handleActivityPress: jest.fn(),
  handleCardPress: jest.fn(),
  handleHamburgerPress: jest.fn(),
  touchAreaSlop,
  headerActionButtonsContainerStyle: {},
  headerAccountPickerStyle: {},
};

describe('WalletHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAccountsMenuAttention).mockReturnValue(false);
    jest.mocked(useLiquidGlass).mockReturnValue(noGlass);
  });

  it('calls handleHamburgerPress when the menu button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <WalletHeader {...defaultProps} />,
    );

    fireEvent.press(
      getByTestId(WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON),
    );

    expect(defaultProps.handleHamburgerPress).toHaveBeenCalledTimes(1);
  });

  describe('when the Money account is visible', () => {
    it('shows the activity button and hides the card button', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <WalletHeader {...defaultProps} isMoneyAccountVisible />,
      );

      expect(
        getByTestId(WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(WalletViewSelectorsIDs.CARD_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('calls handleActivityPress when the activity button is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <WalletHeader {...defaultProps} isMoneyAccountVisible />,
      );

      fireEvent.press(
        getByTestId(WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON),
      );

      expect(defaultProps.handleActivityPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the Money account is not visible', () => {
    it('shows the card button and hides the activity button', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <WalletHeader {...defaultProps} isMoneyAccountVisible={false} />,
      );

      expect(getByTestId(WalletViewSelectorsIDs.CARD_BUTTON)).toBeOnTheScreen();
      expect(
        queryByTestId(WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Accounts menu attention badge', () => {
    it('shows the hamburger badge when there is Accounts menu attention', () => {
      jest.mocked(useAccountsMenuAttention).mockReturnValue(true);

      const { getByTestId } = renderWithProvider(
        <WalletHeader {...defaultProps} />,
      );

      expect(
        getByTestId(WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BADGE),
      ).toBeOnTheScreen();
    });

    it('hides the hamburger badge when there is no Accounts menu attention', () => {
      const { queryByTestId } = renderWithProvider(
        <WalletHeader {...defaultProps} />,
      );

      expect(
        queryByTestId(WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BADGE),
      ).toBeNull();
    });
  });

  it('shows the full account name outside the interim layout', () => {
    const { getByText } = renderWithProvider(
      <WalletHeader
        {...defaultProps}
        useSearchHeaderLayout={false}
        displayName="Test Main Account a really long name"
      />,
    );

    expect(getByText('Test Main Account a really long name')).toBeOnTheScreen();
  });

  describe('interim layout', () => {
    const interimProps: WalletHeaderProps = {
      ...defaultProps,
      useSearchHeaderLayout: false,
      isInterimLayout: true,
    };
    it('shows Activity, Search and Menu without Copy Address when Money is available', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <WalletHeader {...interimProps} isMoneyAccountVisible />,
      );

      expect(
        getByTestId(WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(WalletViewSelectorsIDs.NAVBAR_ADDRESS_COPY_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('drops Activity and shows no Card button when Money is geo-fenced', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <WalletHeader {...interimProps} isMoneyAccountVisible={false} />,
      );

      expect(
        queryByTestId(WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(WalletViewSelectorsIDs.CARD_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        getByTestId(WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON),
      ).toBeOnTheScreen();
    });

    it('truncates the account name to 12 characters', () => {
      const { getByText } = renderWithProvider(
        <WalletHeader
          {...interimProps}
          displayName="Test Main Account a really long name"
        />,
      );

      expect(getByText('Test Main Ac...')).toBeOnTheScreen();
    });

    it('does not split an emoji at the truncation boundary', () => {
      const { getByText } = renderWithProvider(
        <WalletHeader {...interimProps} displayName="Main Accoun🦊 extra" />,
      );

      expect(getByText('Main Accoun🦊...')).toBeOnTheScreen();
    });

    it('keeps account names of 12 characters or fewer intact', () => {
      const { getByText } = renderWithProvider(
        <WalletHeader {...interimProps} displayName="Account 12AB" />,
      );

      expect(getByText('Account 12AB')).toBeOnTheScreen();
    });

    it('opens the account selector from the account picker', () => {
      const navigate = jest.fn();
      const { getByTestId } = renderWithProvider(
        <WalletHeader {...interimProps} navigation={{ navigate }} />,
      );

      fireEvent.press(getByTestId(WalletViewSelectorsIDs.ACCOUNT_ICON));

      expect(navigate).toHaveBeenCalledWith(
        Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_SELECTOR,
        {},
      );
    });

    it('puts the account picker and actions in capsules', () => {
      const { getByTestId } = renderWithProvider(
        <WalletHeader {...interimProps} />,
      );

      expect(
        getByTestId(WalletViewSelectorsIDs.WALLET_HEADER_ACTIONS_CAPSULE),
      ).toBeOnTheScreen();
      expect(
        getByTestId(
          WalletViewSelectorsIDs.WALLET_HEADER_ACCOUNT_PICKER_CAPSULE,
        ),
      ).toBeOnTheScreen();
    });

    it('opens the account selector from the glass account picker', () => {
      jest.mocked(useLiquidGlass).mockReturnValue({
        ...noGlass,
        isGlassEnabled: true,
      });
      const navigate = jest.fn();
      const { getByTestId } = renderWithProvider(
        <WalletHeader {...interimProps} navigation={{ navigate }} />,
      );

      fireEvent.press(getByTestId(WalletViewSelectorsIDs.ACCOUNT_ICON));

      expect(navigate).toHaveBeenCalledWith(
        Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_SELECTOR,
        {},
      );
    });

    it('blurs the capsules on iOS without Liquid Glass', () => {
      jest.mocked(useLiquidGlass).mockReturnValue({
        ...noGlass,
        isBlurEnabled: true,
        blurTint: 'systemChromeMaterialDark',
      });

      renderWithProvider(<WalletHeader {...interimProps} />);

      expect(mockBlurView).toHaveBeenCalledTimes(2);
      expect(mockBlurView).toHaveBeenCalledWith(
        expect.objectContaining({ tint: 'systemChromeMaterialDark' }),
      );
    });

    it('renders plain capsules without Liquid Glass', () => {
      const { getByTestId } = renderWithProvider(
        <WalletHeader {...interimProps} />,
      );

      expect(mockBlurView).not.toHaveBeenCalled();
      expect(
        getByTestId(WalletViewSelectorsIDs.WALLET_HEADER_ACTIONS_CAPSULE),
      ).toHaveStyle({ paddingLeft: 12, paddingRight: 12 });
    });

    it('uses the Social glass header with Profile, account and Rewards actions', () => {
      const handleProfilePress = jest.fn();
      const { getByTestId, queryByTestId } = renderWithProvider(
        <WalletHeader
          {...interimProps}
          isSocialLayout
          handleProfilePress={handleProfilePress}
          handleRewardsPress={jest.fn()}
        />,
      );

      expect(
        getByTestId(WalletViewSelectorsIDs.PROFILE_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(WalletViewSelectorsIDs.ACCOUNT_PICKER_AVATAR),
      ).toBeOnTheScreen();
      expect(mockWalletHeaderProfileAvatar).toHaveBeenCalledWith({
        diameter: 40,
      });

      fireEvent.press(getByTestId(WalletViewSelectorsIDs.PROFILE_BUTTON));

      expect(handleProfilePress).toHaveBeenCalledTimes(1);
      expect(
        getByTestId(WalletViewSelectorsIDs.WALLET_REWARDS_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(WalletViewSelectorsIDs.ACCOUNT_ICON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON),
      ).toBeNull();
      expect(
        getByTestId(
          WalletViewSelectorsIDs.WALLET_HEADER_ACCOUNT_PICKER_CAPSULE,
        ),
      ).toBeOnTheScreen();
    });

    it('keeps Social header action icons transparent while pressed', () => {
      const { getByTestId } = renderWithProvider(
        <WalletHeader
          {...interimProps}
          isSocialLayout
          handleProfilePress={jest.fn()}
          handleRewardsPress={jest.fn()}
        />,
      );

      fireEvent(
        getByTestId(WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON),
        'pressIn',
      );
      fireEvent(
        getByTestId(WalletViewSelectorsIDs.WALLET_REWARDS_BUTTON),
        'pressIn',
      );

      expect(
        StyleSheet.flatten(
          getByTestId(WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON).props.style,
        ).backgroundColor,
      ).toBe('transparent');
      expect(
        StyleSheet.flatten(
          getByTestId(WalletViewSelectorsIDs.WALLET_REWARDS_BUTTON).props.style,
        ).backgroundColor,
      ).toBe('transparent');
    });

    it('keeps the Social account name flexible beside the chevron', () => {
      const { getByText } = renderWithProvider(
        <WalletHeader
          {...interimProps}
          displayName="Test Main Account a really long name"
          isSocialLayout
          handleProfilePress={jest.fn()}
          handleRewardsPress={jest.fn()}
        />,
      );

      expect(
        getByText('Test Main Account a really long name'),
      ).toBeOnTheScreen();
    });
  });

  describe('Social V1 avatar picker', () => {
    const socialV1Props: WalletHeaderProps = {
      ...defaultProps,
      useSearchHeaderLayout: false,
    };

    beforeEach(() => {
      mockSocialV1Enabled = false;
    });

    afterEach(() => {
      mockSocialV1Enabled = false;
    });

    it('shows only the avatar in the header, without the account name', () => {
      mockSocialV1Enabled = true;
      const { getByTestId, queryByTestId } = renderWithProvider(
        <WalletHeader {...socialV1Props} />,
      );

      expect(
        getByTestId(WalletViewSelectorsIDs.ACCOUNT_PICKER_AVATAR),
      ).toBeOnTheScreen();
      // The header's own picker is gone; the name lives in the row under it.
      expect(
        queryByTestId(WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT),
      ).not.toBeOnTheScreen();
    });

    it('keeps the named picker when Social V1 is disabled', () => {
      const { getByTestId, getByText, queryByTestId } = renderWithProvider(
        <WalletHeader {...socialV1Props} />,
      );

      expect(getByText('Account 1')).toBeOnTheScreen();
      expect(
        getByTestId(WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(WalletViewSelectorsIDs.ACCOUNT_PICKER_AVATAR),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(WalletViewSelectorsIDs.WALLET_ACCOUNT_PICKER_ROW),
      ).not.toBeOnTheScreen();
    });

    it('shows only the avatar in the interim layout when Social V1 is enabled', () => {
      mockSocialV1Enabled = true;
      const { getByTestId, queryByTestId } = renderWithProvider(
        <WalletHeader
          {...socialV1Props}
          useSearchHeaderLayout={false}
          isInterimLayout
        />,
      );

      expect(
        getByTestId(WalletViewSelectorsIDs.ACCOUNT_PICKER_AVATAR),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT),
      ).not.toBeOnTheScreen();
    });

    it('still opens the profile drawer from the avatar', () => {
      mockSocialV1Enabled = true;
      const navigate = jest.fn();
      const { getByTestId } = renderWithProvider(
        <WalletHeader {...socialV1Props} navigation={{ navigate }} />,
      );

      fireEvent.press(getByTestId(WalletViewSelectorsIDs.ACCOUNT_ICON));

      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL_PROFILE.DRAWER, {});
    });

    it('shows no dropdown caret in the Social V1 avatar picker', () => {
      mockSocialV1Enabled = true;
      const { queryByTestId } = renderWithProvider(
        <WalletHeader {...socialV1Props} />,
      );

      expect(
        queryByTestId(WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(WalletViewSelectorsIDs.ACCOUNT_PICKER_AVATAR),
      ).toBeOnTheScreen();
    });

    it('renders the named account picker row under the header', () => {
      mockSocialV1Enabled = true;
      const { getByTestId, getByText } = renderWithProvider(
        <WalletHeader {...socialV1Props} />,
      );

      expect(
        getByTestId(WalletViewSelectorsIDs.WALLET_ACCOUNT_PICKER_ROW),
      ).toBeOnTheScreen();
      expect(
        getByTestId(WalletViewSelectorsIDs.WALLET_ACCOUNT_PICKER_ROW_NAME),
      ).toHaveTextContent('Account 1');
      expect(getByText('Account 1')).toBeOnTheScreen();
    });

    it('keeps the row inside the header, so a floating header measures it', () => {
      mockSocialV1Enabled = true;
      const { getByTestId } = renderWithProvider(
        <WalletHeader {...socialV1Props} isInterimLayout />,
      );

      const stack = getByTestId(
        WalletViewSelectorsIDs.WALLET_HEADER_WITH_ACCOUNT_PICKER,
      );

      expect(
        within(stack).getByTestId(WalletViewSelectorsIDs.WALLET_HEADER_ROOT),
      ).toBeOnTheScreen();
      expect(
        within(stack).getByTestId(
          WalletViewSelectorsIDs.WALLET_ACCOUNT_PICKER_ROW,
        ),
      ).toBeOnTheScreen();
    });

    it('opens the account selector from the row, not the profile', () => {
      mockSocialV1Enabled = true;
      const navigate = jest.fn();
      const { getByTestId } = renderWithProvider(
        <WalletHeader {...socialV1Props} navigation={{ navigate }} />,
      );

      fireEvent.press(
        getByTestId(WalletViewSelectorsIDs.WALLET_ACCOUNT_PICKER_ROW_PICKER),
      );

      expect(navigate).toHaveBeenCalledWith(
        Routes.MULTICHAIN_ACCOUNTS.ACCOUNT_SELECTOR,
        {},
      );
    });
  });
});
