// Third party dependencies
import React, { useState } from 'react';
import { View } from 'react-native';

// External dependencies
import { strings } from '../../../../locales/i18n';
import { useStyles } from '../../../component-library/hooks';
import {
  IconName,
  IconColor,
  IconSize,
} from '../../../component-library/components/Icons/Icon';

// Internal dependencies
import styleSheet from './AddSnapAccountModal.styles';
import AddSnapAccountModalContent from './AddSnapAccountModalContent';
import Modal from '../../UI/Notification/Modal';

interface AddSnapAccountPromptModal {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (accountName: string) => void;
  suggestedName: string;
  existingNames: string[];
}

const AddSnapAccountModal: React.FC<AddSnapAccountPromptModal> = ({
  onClose,
  onConfirm,
  suggestedName,
  existingNames,
}) => {
  const [accountName, setAccountName] = useState(suggestedName);
  const [error, setError] = useState('');
  const { styles } = useStyles(styleSheet, {});

  const handleConfirm = () => {
    if (existingNames.includes(accountName)) {
      setError(strings('add_snap_account.name_exists'));
    } else {
      onConfirm(accountName);
    }
  };

  return (
    <View style={styles.content}>
      <Modal
        title={strings('add_snap_account.title')}
        iconName={IconName.Add}
        iconColor={IconColor.Primary}
        iconSize={IconSize.Xl}
        btnLabelCancel={strings('add_snap_account.cancel')}
        btnLabelCta={strings('add_snap_account.confirm')}
        handleCancel={onClose}
        handleCta={handleConfirm}
        hascheckBox={false}
        isChecked={false}
        setIsChecked={() => {}}
        checkBoxLabel=""
        message={strings('add_snap_account.message')}
      />
      <AddSnapAccountModalContent suggestedName={suggestedName} />
    </View>
  );
};

export default AddSnapAccountModal;
