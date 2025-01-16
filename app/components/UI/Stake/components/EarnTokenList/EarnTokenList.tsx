import React from 'react';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

const COPY = {
  SELECT_A_TOKEN: 'Select a token',
};

const EarnTokenList = () => {
  return (
    <BottomSheet>
      <BottomSheetHeader>
        <Text variant={TextVariant.HeadingSM}>{COPY.SELECT_A_TOKEN}</Text>
      </BottomSheetHeader>
    </BottomSheet>
  );
};

export default EarnTokenList;
