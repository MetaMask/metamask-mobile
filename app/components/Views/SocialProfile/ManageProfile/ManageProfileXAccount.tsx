import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';

/** Placeholder reached from the X account row. The form lands in a later change. */
const ManageProfileXAccount = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={ManageProfileSelectorsIDs.X_ACCOUNT_SCREEN}
    >
      <HeaderStandard
        title={strings('manage_profile.x_account')}
        onBack={handleBack}
        includesTopInset
        testID={ManageProfileSelectorsIDs.X_ACCOUNT_HEADER}
        backButtonProps={{
          testID: CommonSelectorsIDs.BACK_ARROW_BUTTON,
        }}
      />
    </SafeAreaView>
  );
};

export default ManageProfileXAccount;
