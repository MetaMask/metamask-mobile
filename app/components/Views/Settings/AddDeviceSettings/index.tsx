import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
import { useNavigation } from '@react-navigation/native';
import {
  AddWallets,
  EnterPassword,
  EnterVerificationCode,
  QrCodeScan,
} from './components';
import { AddDeviceSettingsStep } from './constant';

const AddDeviceSettings = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const [step, setStep] = useState(AddDeviceSettingsStep.ENTER_PASSWORD);

  const handleNextStep = (type: AddDeviceSettingsStep) => {
    setStep(type);
  };

  const renderStep = () => {
    switch (step) {
      case AddDeviceSettingsStep.ENTER_PASSWORD:
        return <EnterPassword onContinue={handleNextStep} />;
      case AddDeviceSettingsStep.ADD_WALLETS:
        return <AddWallets onAddWallets={handleNextStep} />;
      case AddDeviceSettingsStep.SCAN_QR_CODE:
        return <QrCodeScan onScanSuccess={handleNextStep} />;
      case AddDeviceSettingsStep.ENTER_VERIFICATION_CODE:
        return <EnterVerificationCode />;
    }
  };

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderCompactStandard
        onBack={() => navigation.goBack()}
        onClose={() => navigation.goBack()}
        includesTopInset
      />
      {renderStep()}
    </SafeAreaView>
  );
};

export default AddDeviceSettings;
