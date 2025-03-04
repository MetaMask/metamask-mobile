import React from 'react';
import SRPList from '../../UI/SRPList';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { strings } from '../../../../locales/i18n';

const SelectSRP = () => {
  const navigation = useNavigation();

  const onKeyringSelect = (keyringId: string) => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.SRP_REVEAL_QUIZ,
      keyringId,
    });
  };

  return (
    <BottomSheet>
      <BottomSheetHeader onBack={() => navigation.goBack()}>
        <Text variant={TextVariant.HeadingSM}>
          {strings('secure_your_wallet.srp_list_selection')}
        </Text>
      </BottomSheetHeader>
      <SRPList onKeyringSelect={onKeyringSelect} />
    </BottomSheet>
  );
};

export default SelectSRP;
