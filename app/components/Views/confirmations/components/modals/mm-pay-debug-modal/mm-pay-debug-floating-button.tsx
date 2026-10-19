import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { ButtonIcon, IconName } from '@metamask/design-system-react-native';
import { useIsMmPayDebugVisible } from '../../../hooks/pay/debug/useIsMmPayDebugVisible';
import { MmPayDebugModal } from './index';

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10001,
    elevation: 12,
  },
});

export function MmPayDebugFloatingButton() {
  const isVisible = useIsMmPayDebugVisible();
  const [open, setOpen] = useState(false);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <ButtonIcon
        iconName={IconName.Code}
        onPress={() => setOpen(true)}
        testID="mm-pay-debug-button"
        style={styles.floatingButton}
      />
      {open && <MmPayDebugModal onClose={() => setOpen(false)} />}
    </>
  );
}
