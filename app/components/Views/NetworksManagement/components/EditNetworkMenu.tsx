import React, { forwardRef, useCallback } from 'react';

import { Box, BoxAlignItems } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import AccountAction from '../../AccountAction';

import { NetworkManagementItem } from '../NetworksManagementView.types';

interface EditNetworkMenuProps {
  rpcUrl: string;
  chainId: string;
  canDelete: boolean;
  networks: NetworkManagementItem[];
  onClose: () => void;
  onEdit: (rpcUrl: string) => void;
  onDelete: (item: NetworkManagementItem) => void;
}

const EditNetworkMenu = forwardRef<BottomSheetRef, EditNetworkMenuProps>(
  (
    { rpcUrl, chainId, canDelete, networks, onClose, onEdit, onDelete },
    ref,
  ) => {
    const handleEdit = useCallback(() => onEdit(rpcUrl), [onEdit, rpcUrl]);

    const handleDelete = useCallback(() => {
      const item = networks.find((n) => n.chainId === chainId);
      if (item) {
        onDelete(item);
      }
    }, [networks, chainId, onDelete]);

    return (
      <BottomSheet ref={ref} onClose={onClose} shouldNavigateBack={false}>
        <Box alignItems={BoxAlignItems.Center}>
          <AccountAction
            actionTitle={strings('transaction.edit')}
            iconName={IconName.Edit}
            onPress={handleEdit}
          />
          {canDelete && (
            <AccountAction
              actionTitle={strings('app_settings.delete')}
              iconName={IconName.Trash}
              onPress={handleDelete}
            />
          )}
        </Box>
      </BottomSheet>
    );
  },
);

export default EditNetworkMenu;
