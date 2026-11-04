import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CreateVirtualBankAccount from '../CreateVirtualBankAccount';
import { VbaOnboardingRoutes, type VbaOnboardingParamList } from '../routes';

/**
 * VBA's opening screen. It sells the product, then hands off to the KYC-owned
 * vendor terms screen.
 */
const VbaVendorTermsAdapter = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<VbaOnboardingParamList>>();
  const handleSuccess = useCallback(
    () => navigation.navigate(VbaOnboardingRoutes.KYC_VENDOR_TERMS),
    [navigation],
  );

  return <CreateVirtualBankAccount onSuccess={handleSuccess} />;
};

export default VbaVendorTermsAdapter;
