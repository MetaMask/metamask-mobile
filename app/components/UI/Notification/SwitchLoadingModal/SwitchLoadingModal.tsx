import React, { useCallback } from 'react';
import LoaderModal from './LoaderModal';
import Loader from './Loader';

const SwitchLoadingModal = ({
  loading,
  loadingText,
  error,
}: {
  loading: boolean;
  loadingText: string;
  error?: string;
}) => {
  const onCancel = useCallback(() => {
    // Do nothing
  }, []);

  const isVisible = loading || !!error;

  return (
    <LoaderModal isVisible={isVisible} onCancel={onCancel}>
      <Loader
        loadingText={loadingText}
        errorText={error}
        onDismiss={onCancel}
      />
    </LoaderModal>
  );
};

export default SwitchLoadingModal;
