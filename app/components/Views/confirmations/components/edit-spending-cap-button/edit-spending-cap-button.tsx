import React, { useCallback, useState } from 'react';
import { TouchableOpacity } from 'react-native';

import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import {
  EditSpendingCapModal,
  type EditSpendingCapProps,
} from '../modals/edit-spending-cap-modal';
import styleSheet from './edit-spending-cap.styles';

export const EditSpendingCapButton = ({
  spendingCapProps,
  children,
}: {
  spendingCapProps: EditSpendingCapProps;
  children?: React.ReactNode;
}) => {
  const [isModalVisible, setModalVisibility] = useState(false);
  const { styles } = useStyles(styleSheet, {});

  const openModal = useCallback(
    () => setModalVisibility(true),
    [setModalVisibility],
  );

  const closeModal = useCallback(
    () => setModalVisibility(false),
    [setModalVisibility],
  );

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={openModal}
      testID="edit-spending-cap-button"
    >
      {/*
        react-native-modal is patched right now and it puts an extra <View/>
        Keep modal as first child to avoid layout shift caused by "gap" style
      */}
      {isModalVisible && (
        <EditSpendingCapModal onClose={closeModal} {...spendingCapProps} />
      )}
      <Icon
        name={IconName.Edit}
        size={IconSize.Md}
        color={IconColor.InfoDefault}
      />
      {children}
    </TouchableOpacity>
  );
};
