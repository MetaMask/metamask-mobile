import React, { useCallback, useState } from 'react';

import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import {
  EditSpendingCapModal,
  type EditSpendingCapProps,
} from '../modals/edit-spending-cap-modal';

export const EditSpendingCapButton = ({
  spendingCapProps,
}: {
  spendingCapProps: EditSpendingCapProps;
}) => {
  const [isModalVisible, setModalVisibility] = useState(false);

  const openModal = useCallback(
    () => setModalVisibility(true),
    [setModalVisibility],
  );

  const closeModal = useCallback(
    () => setModalVisibility(false),
    [setModalVisibility],
  );

  return (
    <>
      <ButtonIcon
        iconColor={IconColor.Primary}
        iconName={IconName.Edit}
        size={ButtonIconSizes.Md}
        onPress={openModal}
        testID="edit-spending-cap-button"
      />
      {isModalVisible && (
        <EditSpendingCapModal onClose={closeModal} {...spendingCapProps} />
      )}
    </>
  );
};
