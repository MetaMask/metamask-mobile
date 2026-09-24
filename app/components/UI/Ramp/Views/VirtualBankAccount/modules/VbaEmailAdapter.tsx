import React, { useCallback } from 'react';
import KycEmail from '../KycEmail';
import { useOpenVbaOnboarding } from '../hooks/useVbaOnboardingRouting';

const VbaEmailAdapter = () => {
  const advance = useOpenVbaOnboarding('email-complete');
  const handleSuccess = useCallback(() => advance(), [advance]);

  return <KycEmail onSuccess={handleSuccess} />;
};

export default VbaEmailAdapter;
