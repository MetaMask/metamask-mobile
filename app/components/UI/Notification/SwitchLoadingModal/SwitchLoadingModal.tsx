import React, { useCallback, useEffect, useState } from 'react';
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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(loading || !!error);
  }, [loading, error]);

  const handleVisibility = useCallback(() => {
    setIsVisible(false);
  }, []);

  return (
    <LoaderModal isVisible={isVisible} onCancel={handleVisibility}>
      <Loader
        loadingText={loadingText}
        errorText={error}
        onDismiss={handleVisibility}
      />
    </LoaderModal>
  );
};

export default SwitchLoadingModal;
