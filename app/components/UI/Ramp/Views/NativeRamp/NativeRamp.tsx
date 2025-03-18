import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import ScreenLayout from '../../components/ScreenLayout';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './NativeRamp.styles';
import Row from '../../components/Row';
import StyledButton from '../../../StyledButton';
import { getNativeRampNavigationOptions } from '../../../Navbar';
import ProgressBar from '../../../../Views/SmartTransactionStatus/ProgressBar';
import { TextInput, View, Image, ActivityIndicator } from 'react-native';
import { NativeRampService } from '@consensys/on-ramp-sdk';
import { AmountViewSelectorsIDs } from '../../../../../../e2e/selectors/SendFlow/AmountView.selectors';
import backupImage from '../../../../../images/explain-backup-seedphrase.png';
import {
  KycForm,
  NativeTransakAccessToken,
  BuyOrder,
  TransakEnvironment,
} from '@consensys/on-ramp-sdk/dist/NativeRampService';
import { storeTransakToken, getTransakToken } from './TransakTokenVault';
import { useRampSDK } from '../../sdk';
import { baseStyles } from '../../../../../styles/common';

function NativeRamp() {
  const navigation = useNavigation();
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {});
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [amount, setAmount] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [forms, setForms] = useState<KycForm[]>([]);
  const [accessToken, setAccessToken] =
    useState<NativeTransakAccessToken | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);
  const [currentFormFields, setCurrentFormFields] = useState<any[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isKycApproved, setIsKycApproved] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'creating' | 'waiting' | null>(
    null,
  );
  const [orderData, setOrderData] = useState<BuyOrder | null>(null);
  const [sepaData, setSepaData] = useState<any>(null);
  const [idProofFormData, setIdProofFormData] = useState<KycForm | null>(null);
  const [purposeOfUsageFormData, setPurposeOfUsageFormData] =
    useState<KycForm | null>(null);
  const [kycWebviewUrl, setKycWebviewUrl] = useState<string | null>(null);

  const { selectedAddress } = useRampSDK();

  const [nativeRampService] = useState(
    () =>
      new NativeRampService(
        TransakEnvironment.Staging,
        process.env.TRANSAK_API_KEY || '',
        process.env.TRANSAK_FRONTEND_AUTH || '',
      ),
  );

  useEffect(() => {
    const getScreenTitle = () => {
      switch (currentStep) {
        case 1:
          return 'Deposit';
        case 2:
          return 'Verify your identity';
        case 3:
          return 'Enter your email';
        case 4:
          return 'Enter six-digit code';
        case 6:
          return 'Verification Complete';
        case 7:
          return 'Confirm purchase';
        case 8:
          return 'Transaction successful';
        default:
          return 'Deposit';
      }
    };

    navigation.setOptions(
      getNativeRampNavigationOptions(getScreenTitle(), colors, navigation),
    );
  }, [navigation, colors, currentStep]);

  const handleEmailSubmit = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Sending verification code...');
      await nativeRampService.sendUserOtp(email);
      setCurrentStep(4);
    } catch (error) {
      console.error('Error sending OTP:', error);
      // Handle error
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const fetchKycForms = async (token: NativeTransakAccessToken) => {
    try {
      setLoadingMessage('Getting quote...');
      const newQuote = await nativeRampService.getBuyQuote(
        'EUR',
        'USDC',
        'arbitrum',
        'sepa_bank_transfer',
        amount,
      );
      setQuote(newQuote);
      setLoadingMessage('Fetching KYC forms...');
      const kycForms = await nativeRampService.getKYCForms(token, newQuote);

      const purposeOfUsageForm = kycForms.forms.find(
        (form) => form.id === 'purposeOfUsage',
      );
      const idProofForm = kycForms.forms.find((form) => form.id === 'idProof');

      // Get regular forms (excluding special forms)
      const filteredForms = kycForms.forms.filter(
        (form) => ![purposeOfUsageForm?.id, idProofForm?.id].includes(form.id),
      );

      setForms(filteredForms);

      // Set initial form fields if we have regular forms
      if (filteredForms.length > 0) {
        setLoadingMessage('Preparing KYC forms...');
        const formDetails = await nativeRampService.getKycForm(
          token,
          newQuote,
          filteredForms[0],
        );
        setCurrentFormFields(formDetails.fields || []);
      }

      // Store idProof and purposeOfUsage form for later use
      if (idProofForm) {
        setIdProofFormData(idProofForm);
      }

      if (purposeOfUsageForm) {
        setPurposeOfUsageFormData(purposeOfUsageForm);
      }
    } catch (error) {
      console.error('Error in fetchKycForms:', error);
    }
  };

  const handleOtpSubmit = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Verifying code...');
      const token = await nativeRampService.verifyUserOtp(email, otp);

      const tokenStoreResult = await storeTransakToken(token);
      if (!tokenStoreResult.success) {
        throw new Error('Failed to store access token');
      }

      setAccessToken(token);

      setLoadingMessage('Checking user details...');
      const userDetails = await nativeRampService.getUserDetails(token);
      // If KYC is already approved, we can skip the KYC forms
      if (userDetails.isKycApproved()) {
        setIsKycApproved(true);
        await fetchKycForms(token); // Still need quote for the next steps
        setCurrentStep(6);
      } else {
        await fetchKycForms(token);
        setCurrentStep(5);
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const waitForKycApproval = async (token: NativeTransakAccessToken) => {
    const maxRetries = 20; // 10 minutes max wait time
    let retries = 0;

    while (retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds

      const userDetails = await nativeRampService.getUserDetails(token);
      console.log(`User KYC Status: ${userDetails.kyc?.l1?.status}`);

      if (userDetails.kyc?.l1?.status === 'APPROVED') {
        return true;
      }

      retries++;
    }

    throw new Error('KYC approval timeout reached.');
  };

  const handleFormSubmit = async () => {
    try {
      if (!accessToken || !idProofFormData) return;

      setIsLoading(true);
      setLoadingMessage('Submitting form...');
      await nativeRampService.patchUser(accessToken, formValues);

      // If we're done with regular forms, move to ID proof
      if (currentFormIndex === forms.length - 1) {
        setLoadingMessage('Loading ID verification...');
        const idProofFormDetails = await nativeRampService.getKycForm(
          accessToken,
          quote,
          idProofFormData,
        );

        if (idProofFormDetails.data?.kycUrl) {
          setKycWebviewUrl(idProofFormDetails.data.kycUrl);
          setCurrentStep(5.5); // New step for webview
        }
      } else {
        // Handle next regular form as before
        setLoadingMessage('Loading next form...');
        const nextForm = forms[currentFormIndex + 1];
        const formDetails = await nativeRampService.getKycForm(
          accessToken,
          quote,
          nextForm,
        );
        setCurrentFormFields(formDetails.fields || []);
        setCurrentFormIndex(currentFormIndex + 1);
        setFormValues({});
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleWebviewComplete = async () => {
    try {
      if (!accessToken || !purposeOfUsageFormData) return;

      setIsLoading(true);
      setLoadingMessage('Waiting for KYC approval...');

      // Wait for KYC approval
      await waitForKycApproval(accessToken);

      // Submit purpose of usage form
      setLoadingMessage('Submitting final verification...');
      await nativeRampService.submitPurposeOfUsageForm(accessToken, [
        'Buying/selling crypto for investments',
      ]);

      setIsKycApproved(true);
      setCurrentStep(6);
    } catch (error) {
      console.error('Error completing KYC:', error);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const waitForOrderCompletedStatus = async (order: BuyOrder) => {
    if (!accessToken) return;

    const maxRetries = 20; // 10 minutes max wait time
    let retries = 0;

    while (retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds

      const transakOrderData = await nativeRampService.getOrder(
        accessToken,
        order.id,
      );

      console.log(
        `Order Status: ${transakOrderData.status} (Retry ${
          retries + 1
        }/${maxRetries})`,
      );

      if (transakOrderData.status === 'COMPLETED') {
        return orderData;
      }

      retries++;
    }

    throw new Error('Order completion timeout reached.');
  };

  const handleCreateOrder = async () => {
    try {
      if (!accessToken) return;
      setIsLoading(true);
      setLoadingMessage('Creating order...');

      // Reserve wallet with actual address
      const reservation = await nativeRampService.walletReserve(
        quote,
        selectedAddress,
      );

      console.log('reservation', reservation);

      // Create order
      const order = await nativeRampService.createOrder(
        accessToken,
        reservation,
      );
      setOrderData(order);

      console.log('order', order);

      // Find SEPA payment option
      const sepa = order.paymentOptions.find(
        (p) => p.id === 'sepa_bank_transfer',
      );

      console.log('sepa', sepa);

      if (!sepa) throw new Error('SEPA payment option not found');

      setSepaData(sepa);
      setCurrentStep(7);
    } catch (error) {
      console.error('Error creating order:', error);
      // Handle error appropriately
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleConfirmBankTransfer = async () => {
    try {
      if (!accessToken || !orderData || !sepaData) return;

      setOrderStatus('creating');

      // Confirm payment
      await nativeRampService.confirmPayment(accessToken, orderData, sepaData);

      // Wait for order completion
      setOrderStatus('waiting');
      const completedOrder = await waitForOrderCompletedStatus(orderData);
      console.log('completedOrder', completedOrder);

      // Move to success screen
      setCurrentStep(8);
      setOrderStatus(null);
    } catch (error) {
      console.error('Error confirming bank transfer:', error);
      setOrderStatus(null);
    }
  };

  const handleContinue = async () => {
    switch (currentStep) {
      case 1: {
        // if we have an accessToken and the token is still valid, skip the login
        const tokenResult = await getTransakToken();
        if (tokenResult.success && tokenResult.token) {
          setIsLoading(true);
          try {
            setAccessToken(tokenResult.token);
            setLoadingMessage('Checking user details...');
            const userDetails = await nativeRampService.getUserDetails(
              tokenResult.token,
            );

            if (userDetails.isKycApproved()) {
              setIsKycApproved(true);
              await fetchKycForms(tokenResult.token); // Still need quote for the next steps
              setCurrentStep(6); // Skip to KYC approved screen
            } else {
              await fetchKycForms(tokenResult.token);
              setCurrentStep(5);
            }
          } catch (error) {
            console.log('Error checking user details:', error);
            // Token is invalid/expired, continue with normal flow
            setAccessToken(null);
            setCurrentStep(2);
          } finally {
            setIsLoading(false);
          }
        } else {
          setCurrentStep(2);
        }
        break;
      }
      case 2:
        setCurrentStep(3);
        break;
      case 3:
        handleEmailSubmit();
        break;
      case 4:
        handleOtpSubmit();
        break;
      case 5:
        handleFormSubmit();
        break;
      case 6:
        handleCreateOrder();
        break;
      case 7:
        handleConfirmBankTransfer();
        break;
    }
  };

  const renderDepositStep = () => (
    <View style={styles.inputContainerWrapper}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={amount}
          onChangeText={setAmount}
          keyboardType={'numeric'}
          placeholderTextColor={colors.text.muted}
          testID={AmountViewSelectorsIDs.AMOUNT_INPUT}
        />
        <Text style={styles.currencyText}>EUR</Text>
      </View>
    </View>
  );

  const renderExplainerStep = () => (
    <>
      <Row style={styles.explainerImageContainer}>
        <Image
          source={backupImage}
          style={styles.explainerImage}
          resizeMode="contain"
        />
      </Row>
      <Row style={styles.explainerTextContainer}>
        <Text variant={TextVariant.BodyMD} style={styles.centered}>
          To deposit cash into your MetaMask account, we&apos;ll need to verify
          your identity for security reasons. This helps keep your account safe
          and only takes a few easy steps.
        </Text>
      </Row>
      <Row>
        <Text variant={TextVariant.BodyMD} style={styles.centered}>
          Want to learn more about how we protect your privacy?{' '}
          <Text
            variant={TextVariant.BodyMD}
            style={{ color: colors.primary.default }}
            onPress={() => {
              // Handle link press
            }}
          >
            Check out this article.
          </Text>
        </Text>
      </Row>
    </>
  );

  const renderStepOne = () => (
    <>
      <Row>
        <Text variant={TextVariant.BodyMD}>
          We&apos;ll send a six-digit code to your email to check it&apos;s you.
        </Text>
      </Row>
      <Row style={styles.emailInputContainer}>
        <TextInput
          keyboardType="email-address"
          placeholder="name@domain.com"
          style={styles.emailInput}
          value={email}
          onChangeText={(text) => setEmail(text.toLowerCase())}
        />
      </Row>
    </>
  );

  const renderStepTwo = () => (
    <>
      <Row>
        <Text variant={TextVariant.BodyMD}>
          Enter the code we sent to {email}. If you don&apos;t see it in your
          inbox soon, check your spam folder.
        </Text>
      </Row>
      <Row style={styles.emailInputContainer}>
        <TextInput
          keyboardType="numeric"
          placeholder="000000"
          style={styles.emailInput}
          maxLength={6}
          value={otp}
          onChangeText={setOtp}
        />
      </Row>
      <Row>
        <Text variant={TextVariant.BodyMD}>
          Didn&apos;t receive the code?{' '}
          <Text
            variant={TextVariant.BodyMD}
            style={{ color: colors.primary.default }}
            onPress={handleEmailSubmit}
          >
            Resend it
          </Text>
        </Text>
      </Row>
    </>
  );

  const renderStepKycForms = () => {
    const currentForm = forms[currentFormIndex];
    if (!currentForm) return null;

    return (
      <>
        <Row>
          <Text variant={TextVariant.HeadingSM}>
            Form {currentFormIndex + 1} of {forms.length}
          </Text>
        </Row>
        <Row>
          <Text variant={TextVariant.BodyMD}>
            Please fill in the following information:
          </Text>
        </Row>
        {currentFormFields.map((field) => (
          <Row key={field.id} style={styles.formFieldContainer}>
            <Text variant={TextVariant.BodyMD}>
              {field.name} {field.isRequired && '*'}
            </Text>
            <TextInput
              style={styles.formInput}
              value={formValues[field.id] || ''}
              onChangeText={(text) =>
                setFormValues((prev) => ({ ...prev, [field.id]: text }))
              }
              placeholder={field.name}
            />
          </Row>
        ))}
      </>
    );
  };

  const renderKycSuccessScreen = () => (
    <>
      <Row style={styles.successIconContainer}>
        <Image
          source={backupImage}
          style={styles.successIcon}
          resizeMode="contain"
        />
      </Row>
      <Row style={styles.successTextContainer}>
        <Text variant={TextVariant.HeadingLG} style={styles.centered}>
          Congratulations!
        </Text>
      </Row>
      <Row style={styles.successTextContainer}>
        <Text variant={TextVariant.BodyMD} style={styles.centered}>
          Your application is approved, and you can now finish your transaction.
        </Text>
      </Row>
    </>
  );

  const renderConfirmationScreen = () => (
    <>
      <Row style={styles.confirmationAmountContainer}>
        <Text variant={TextVariant.HeadingLG} style={styles.confirmationAmount}>
          {amount} EUR
        </Text>
        <Text variant={TextVariant.BodyMD} style={styles.fiatAmount}>
          ≈ {quote?.cryptoAmount || amount} USDC
        </Text>
      </Row>

      <Row style={styles.bankTransferNote}>
        <Text variant={TextVariant.BodyMD} style={styles.centered}>
          Transfer funds to this account to complete your purchase
        </Text>
      </Row>

      <View style={styles.confirmationDetails}>
        <Row style={styles.detailRow}>
          <Text variant={TextVariant.BodyMD}>Account Type</Text>
          <Text variant={TextVariant.BodyMD}>
            {sepaData?.fields?.find(
              (f: { name: string; value: string }) => f.name === 'Account Type',
            )?.value || ''}
          </Text>
        </Row>

        <Row style={styles.detailRow}>
          <Text variant={TextVariant.BodyMD}>Beneficiary Name</Text>
          <Text variant={TextVariant.BodyMD}>
            {`${
              sepaData?.fields?.find(
                (f: { name: string; value: string }) =>
                  f.name === 'First Name (Beneficiary)',
              )?.value || ''
            } ${
              sepaData?.fields?.find(
                (f: { name: string; value: string }) =>
                  f.name === 'Last Name (Beneficiary)',
              )?.value || ''
            }`}
          </Text>
        </Row>

        <Row style={styles.detailRow}>
          <Text variant={TextVariant.BodyMD}>IBAN</Text>
          <Text variant={TextVariant.BodyMD}>
            {sepaData?.fields?.find(
              (f: { name: string; value: string }) => f.name === 'IBAN',
            )?.value || ''}
          </Text>
        </Row>

        <Row style={styles.detailRow}>
          <Text variant={TextVariant.BodyMD}>Bank Name</Text>
          <Text variant={TextVariant.BodyMD}>
            {sepaData?.fields?.find(
              (f: { name: string; value: string }) => f.name === 'Bank Name',
            )?.value || ''}
          </Text>
        </Row>

        <Row style={styles.detailRow}>
          <Text variant={TextVariant.BodyMD}>Bank Country</Text>
          <Text variant={TextVariant.BodyMD}>
            {sepaData?.fields?.find(
              (f: { name: string; value: string }) => f.name === 'Bank Country',
            )?.value || ''}
          </Text>
        </Row>

        <Row style={[styles.detailRow, styles.totalRow]}>
          <Text variant={TextVariant.BodyMD}>Bank Address</Text>
          <Text variant={TextVariant.BodyMD} style={styles.bankAddress}>
            {sepaData?.fields?.find(
              (f: { name: string; value: string }) => f.name === 'Bank Address',
            )?.value || ''}
          </Text>
        </Row>
      </View>
    </>
  );

  const renderWebviewStep = () => (
    <>
      <Row>
        <Text variant={TextVariant.BodyMD}>
          Please complete your ID verification in the window below:
        </Text>
      </Row>
      {kycWebviewUrl && (
        <View style={baseStyles.flexGrow}>
          <StyledButton
            type="confirm"
            onPress={() => {
              navigation.navigate('Webview', {
                screen: 'SimpleWebview',
                params: {
                  url: kycWebviewUrl,
                },
              });
            }}
          >
            Start Verification
          </StyledButton>
        </View>
      )}
    </>
  );

  const renderLoadingScreen = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary.default} />
      <Text variant={TextVariant.BodyMD} style={styles.loadingText}>
        {loadingMessage ||
          (orderStatus === 'creating'
            ? 'Creating your order...'
            : 'Waiting for order completion...')}
      </Text>
    </View>
  );

  const renderOrderSuccess = () => (
    <>
      <Row style={styles.successAmountContainer}>
        <Text variant={TextVariant.HeadingLG} style={styles.successAmount}>
          {orderData?.cryptoAmount || amount} USDC
        </Text>
        <Text variant={TextVariant.BodyMD} style={styles.fiatAmount}>
          {orderData?.fiatAmount || amount} EUR
        </Text>
      </Row>

      <Row style={styles.successMessageContainer}>
        <Text variant={TextVariant.BodyMD} style={styles.centered}>
          Your USDC is now available for use.
        </Text>
      </Row>

      <View style={styles.successDetails}>
        <Row style={styles.detailRow}>
          <Text variant={TextVariant.BodyMD}>Account</Text>
          <Text variant={TextVariant.BodyMD}>Account H (0x37b...B2e9)</Text>
        </Row>

        <Row style={styles.detailRow}>
          <Text variant={TextVariant.BodyMD}>Order ID</Text>
          <Text variant={TextVariant.BodyMD}>Feb 1 2025, 5:07PM</Text>
        </Row>

        <Row style={styles.detailRow}>
          <Text variant={TextVariant.BodyMD}>Paid with</Text>
          <View style={styles.detailRowEnd}>
            <Text variant={TextVariant.BodyMD}>SEPA Bank Transfer</Text>
          </View>
        </Row>

        <Row style={styles.detailRow}>
          <Text variant={TextVariant.BodyMD}>Total fees</Text>
          <Text variant={TextVariant.BodyMD}>$0.00</Text>
        </Row>

        <Row style={[styles.detailRow, styles.totalRow]}>
          <Text variant={TextVariant.BodyMD}>Purchase amount total</Text>
          <Text variant={TextVariant.BodyMD}>
            {orderData?.fiatAmount || amount} EUR
          </Text>
        </Row>
      </View>

      <Row style={styles.etherscanLink}>
        <Text
          variant={TextVariant.BodyMD}
          style={styles.linkText}
          onPress={() => {
            // Handle etherscan link press
          }}
        >
          View on Etherscan
        </Text>
      </Row>
    </>
  );

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        {currentStep >= 3 && currentStep < 6 && (
          <Row style={styles.progressBarContainer}>
            <ProgressBar percentComplete={(currentStep - 2) * 25} />
          </Row>
        )}
        <ScreenLayout.Content>
          {isLoading ? (
            renderLoadingScreen()
          ) : (
            <>
              {currentStep === 1 && renderDepositStep()}
              {currentStep === 2 && renderExplainerStep()}
              {currentStep === 3 && renderStepOne()}
              {currentStep === 4 && renderStepTwo()}
              {currentStep === 5 && renderStepKycForms()}
              {currentStep === 5.5 && renderWebviewStep()}
              {currentStep === 6 && renderKycSuccessScreen()}
              {currentStep === 7 && !orderStatus && renderConfirmationScreen()}
              {currentStep === 8 && renderOrderSuccess()}
              {currentStep === 7 && orderStatus && renderLoadingScreen()}
            </>
          )}
        </ScreenLayout.Content>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <Row style={styles.cta}>
            <StyledButton
              type="confirm"
              onPress={
                currentStep === 5.5 ? handleWebviewComplete : handleContinue
              }
              loading={isLoading}
              disabled={orderStatus !== null}
            >
              {currentStep === 5.5
                ? 'Complete Verification'
                : currentStep === 8
                ? 'Swap for tokens'
                : currentStep === 7
                ? 'Confirm bank transfer'
                : currentStep === 6
                ? 'Continue to purchase'
                : currentStep === 2
                ? 'Get started'
                : 'Continue'}
            </StyledButton>
          </Row>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
}

export default NativeRamp;
