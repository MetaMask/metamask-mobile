import React, { ReactNode, useState } from 'react';
import { View } from 'react-native';

import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import InfoModal from '../../../../../../components/UI/Swaps/components/InfoModal';
import {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';

interface TooltipProps {
  content: ReactNode;
  title?: string;
  testID?: string;
}

const Tooltip = ({ content, title, testID }: TooltipProps) => {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <ButtonIcon
        iconColor={IconColor.Muted}
        iconName={IconName.Info}
        onPress={() => setOpen(true)}
        size={ButtonIconSizes.Sm}
        testID={testID ?? 'tooltipTestId'}
      />
      {open && (
        <InfoModal
          body={content}
          isVisible={open}
          title={title}
          toggleModal={() => setOpen(false)}
        />
      )}
    </View>
  );
};

export default Tooltip;
