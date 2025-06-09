import React, { Fragment, useRef } from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { SafeAreaView, View } from 'react-native';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import SelectSRP from './SelectSRP';
import { strings } from '../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';

export const SelectSRPBottomSheet = () => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();

  return (
    <BottomSheet ref={bottomSheetRef}>
      <SafeAreaView>
        <Fragment>
          <SheetHeader
            title={strings('secure_your_wallet.srp_list_selection')}
            onBack={() => {
              navigation.goBack();
            }}
          />
          <View
            // eslint-disable-next-line react-native/no-inline-styles
            style={{ marginTop: -16 }}
          >
            <SelectSRP />
          </View>
        </Fragment>
      </SafeAreaView>
    </BottomSheet>
  );
};
