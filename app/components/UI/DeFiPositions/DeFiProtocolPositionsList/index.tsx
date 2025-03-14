import React, { useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../../util/theme';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import createStyles from '../styles';
import Text, {
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { GroupedPositions } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';

interface DeFiProtocolPositionsListProps {
  defiPositions: { [key: Hex]: GroupedPositions } | null;
  //   refreshing: boolean;
  //   isAddTokenEnabled: boolean;
  //   onRefresh: () => void;
  //   showRemoveMenu: (arg: TokenI) => void;
  //   goToAddToken: () => void;
  //   showPercentageChange?: boolean;
  //   showNetworkBadge?: boolean;
}

export const DeFiProtocolPositionsList = ({
  defiPositions,
}: DeFiProtocolPositionsListProps) => {
  const { colors } = useTheme();
  const privacyMode = useSelector(selectPrivacyMode);

  const styles = createStyles(colors);
  const navigation = useNavigation();

  //   const handleLink = () => {
  //     navigation.navigate(Routes.SETTINGS_VIEW, {
  //       screen: Routes.ONBOARDING.GENERAL_SETTINGS,
  //     });
  //   };

  if (!defiPositions || Object.keys(defiPositions).length === 0) {
    return (
      <View style={styles.emptyView}>
        <View style={styles.emptyTokensView}>
          <Text style={styles.emptyTokensViewText}>
            {/* TODO: Custom message needed */}
            {strings('wallet.no_tokens')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text>DeFi Protocol Positions List</Text>
    </View>
    // <FlatList
    //   testID={WalletViewSelectorsIDs.TOKENS_CONTAINER_LIST}
    //   data={positions}
    //   renderItem={({ item }) => (
    //     <TokenListItem
    //       asset={item}
    //       showRemoveMenu={showRemoveMenu}
    //       showScamWarningModal={showScamWarningModal}
    //       setShowScamWarningModal={setShowScamWarningModal}
    //       privacyMode={privacyMode}
    //       showPercentageChange={showPercentageChange}
    //       showNetworkBadge={showNetworkBadge}
    //     />
    //   )}
    //   keyExtractor={(_, index) => index.toString()}
    // />
  );
};
