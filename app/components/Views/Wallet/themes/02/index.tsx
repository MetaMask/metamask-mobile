import React from 'react';
import { ScrollView, SafeAreaView } from 'react-native';

import { baseStyles } from '../../../../../styles/common';
import ErrorBoundary from '../../../ErrorBoundary';
import generateTestId from '../../../../../../wdio/utils/generateTestId';
import { NftBackground } from '../../../../Base/NFT';
import { SmartActions, Action } from '../../../../Base/SmartActions';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';

const Custom01 = ({
  selectedAddress,
  renderContent,
  renderLoader,
  renderOnboardingWizard,
}: {
  selectedAddress: string;
  renderContent: () => JSX.Element;
  renderLoader: () => JSX.Element;
  renderOnboardingWizard: () => JSX.Element;
}) => {
  const navigation = useNavigation();
  const WALLET_SMART_ACTIONS: Action[] = [
    {
      title: strings('asset_overview.earn_button'),
      iconName: IconName.Graph,
      onPress: () => navigation.navigate('SendFlowView'),
      onLongPress: () => {},
      tooltip: 'teste',
    },
    {
      title: strings('asset_overview.send_button'),
      label: 'Hot',
      iconName: IconName.Send2,
      onPress: () => navigation.navigate('SendFlowView'),
      onLongPress: () => {},
      tooltip: 'teste',
      disabled: false,
    },
    {
      title: strings('asset_overview.receive_button'),
      iconName: IconName.Received,
      onPress: () => navigation.navigate('PaymentRequestView'),
      onLongPress: () => {},
    },
    {
      title: strings('asset_overview.swap'),
      iconName: IconName.SwapHorizontal,
      onPress: () => navigation.navigate('Swaps'),
      onLongPress: () => {},
      tooltip: 'teste',
    },
    {
      title: strings('asset_overview.more_button'),
      iconName: IconName.MoreHorizontal,
      onPress: () => {},
      onLongPress: () => {},
      tooltip: 'teste',
    },
  ];

  return (
    <ErrorBoundary navigation={navigation} view="Wallet">
      <ScrollView
        style={baseStyles.flexGrow}
        {...generateTestId('wallet-screen')}
      >
        <NftBackground />
        <SmartActions actions={WALLET_SMART_ACTIONS} showToolTips />
        {/* {renderContent()} */}
      </ScrollView>
    </ErrorBoundary>
  );
};

export default Custom01;
