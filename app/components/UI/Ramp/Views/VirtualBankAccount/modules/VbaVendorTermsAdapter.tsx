import React, { useCallback } from 'react';
import CreateVirtualBankAccount from '../CreateVirtualBankAccount';
import { useOpenVbaOnboarding } from '../hooks/useVbaOnboardingRouting';

const VbaVendorTermsAdapter = () => {
  const advance = useOpenVbaOnboarding('vendor-terms-complete');
  const handleSuccess = useCallback(() => advance(), [advance]);

  return <CreateVirtualBankAccount onSuccess={handleSuccess} />;
};

export default VbaVendorTermsAdapter;
