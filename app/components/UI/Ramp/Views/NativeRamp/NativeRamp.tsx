import React, { useState, useEffect, useRef } from 'react';
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
import {
  TextInput,
  View,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { NativeRampService } from '@consensys/on-ramp-sdk';
import { AmountViewSelectorsIDs } from '../../../../../../e2e/selectors/SendFlow/AmountView.selectors';
import backupImage from '../../../../../images/explain-backup-seedphrase.png';
import {
  KycForm,
  NativeTransakAccessToken,
  BuyOrder,
  TransakEnvironment,
  BuyQuote,
  OrderPaymentMethod,
} from '@consensys/on-ramp-sdk/dist/NativeRampService';
import {
  storeTransakToken,
  getTransakToken,
  resetTransakToken,
} from './TransakTokenVault';
import { useRampSDK } from '../../sdk';
import { createKycWebviewNavDetails } from './NativeRampWebView';

function NativeRamp() {
  const navigation = useNavigation();
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {});
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [amount, setAmount] = useState('');
  const amountInputRef = useRef<TextInput>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [forms, setForms] = useState<KycForm[]>([]);
  const [accessToken, setAccessToken] =
    useState<NativeTransakAccessToken | null>(null);
  const [quote, setQuote] = useState<BuyQuote | null>(null);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);
  const [currentFormFields, setCurrentFormFields] = useState<
    {
      id: string;
      name: string;
      isRequired: boolean;
    }[]
  >([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [orderData, setOrderData] = useState<BuyOrder | null>(null);
  const [sepaData, setSepaData] = useState<OrderPaymentMethod | null>(null);
  const [idProofForm, setIdProofForm] = useState<KycForm | null>(null);

  const { selectedAddress } = useRampSDK();

  const [nativeRampService] = useState(
    () =>
      new NativeRampService(
        process.env.TRANSAK_ENVIRONMENT === 'staging'
          ? TransakEnvironment.Staging
          : TransakEnvironment.Production,
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
        case 5:
          return 'Verify your identity';
        case 5.5:
          return 'Verify your identity';
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

  useEffect(() => {
    if (currentStep === 1) {
      amountInputRef.current?.focus();
    }
  }, [currentStep]);

  // This is a helper function just for the POC to be able to identify errors
  const getErrorMessage = (error: any): string => {
    if (error?.isAxiosError) {
      const axiosError = error.response?.data;

      if (axiosError?.message) {
        return axiosError.message;
      }
      if (axiosError?.error?.message) {
        return axiosError.error.message;
      }
      if (axiosError?.errors?.[0]) {
        return axiosError.errors[0];
      }
      if (typeof axiosError === 'string') {
        return axiosError;
      }
      if (error.response?.status) {
        return `Request failed (${error.response.status}): ${error.response.statusText}`;
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (error?.message) {
      return error.message;
    }

    if (error?.error) {
      return error.error;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'An unexpected error occurred. Please try again.';
  };

  const handleEmailSubmit = async () => {
    try {
      setIsLoading(true);
      setLoadingMessage('Sending verification code...');
      await nativeRampService.sendUserOtp(email);
      setCurrentStep(4);
    } catch (error) {
      console.error('Error sending OTP:', error);
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleCreateOrder = async () => {
    if (!accessToken || !quote) return;
    try {
      setIsLoading(true);
      setLoadingMessage('Creating order...');
      const reservation = await nativeRampService.walletReserve(
        quote as BuyQuote,
        selectedAddress,
      );
      const order = await nativeRampService.createOrder(
        accessToken,
        reservation,
      );
      setOrderData(order);

      const sepa = order.paymentOptions.find(
        (p) => p.id === 'sepa_bank_transfer',
      );

      if (!sepa) throw new Error('SEPA payment option not found');

      setSepaData(sepa);
      setCurrentStep(7);
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Error', getErrorMessage(error));
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
      const kycForms = await nativeRampService.getKYCForms(
        token,
        newQuote as BuyQuote,
      );

      const purposeOfUsageForm = kycForms.forms.find(
        (form) => form.id === 'purposeOfUsage',
      );
      const foundIdProofForm = kycForms.forms.find(
        (form) => form.id === 'idProof',
      );

      // Get regular forms (excluding special forms)
      const filteredForms = kycForms.forms.filter(
        (form) =>
          ![purposeOfUsageForm?.id, foundIdProofForm?.id].includes(form.id),
      );

      setForms(filteredForms);

      // Set initial form fields if we have regular forms
      if (filteredForms.length > 0) {
        setLoadingMessage('Preparing KYC forms...');
        const formDetails = await nativeRampService.getKycForm(
          token,
          newQuote as BuyQuote,
          filteredForms[0],
        );
        setCurrentFormFields(formDetails.fields || []);
      }

      // Store idProof for later use
      if (foundIdProofForm) {
        setIdProofForm(foundIdProofForm);
      }
    } catch (error) {
      console.error('Error in fetchKycForms:', error);
      Alert.alert('Error', getErrorMessage(error));
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
        setCurrentStep(6);
        await fetchKycForms(token); // Still need quote for the next steps
      } else {
        await fetchKycForms(token);
        setCurrentStep(5);
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleFormSubmit = async () => {
    try {
      if (!accessToken || !quote) {
        Alert.alert('Error', 'Missing required data. Please try again.');
        return;
      }

      setIsLoading(true);
      setLoadingMessage('Submitting form...');
      await nativeRampService.patchUser(accessToken, formValues);

      // If we're done with regular forms, move to ID proof
      if (currentFormIndex === forms.length - 1) {
        setLoadingMessage('Submitting purpose of usage...');
        await nativeRampService.submitPurposeOfUsageForm(accessToken, [
          'Buying/selling crypto for investments',
        ]);

        if (idProofForm) {
          setLoadingMessage('Loading ID verification...');
          const idProofFormData = await nativeRampService.getKycForm(
            accessToken,
            quote as BuyQuote,
            idProofForm,
          );

          if (idProofFormData?.data?.kycUrl) {
            // Start polling for KYC approval in parallel
            setCurrentStep(5.5);
            setLoadingMessage('Waiting for KYC approval...');

            // Navigate to KYC webview
            navigation.navigate(
              ...createKycWebviewNavDetails({
                url: idProofFormData.data.kycUrl,
              }),
            );

            // Start polling for KYC approval
            let retries = 0;
            const maxRetries = 40; // 20 minutes max wait time
            const pollInterval = 30000; // 30 seconds

            const pollKycStatus = async () => {
              try {
                const userDetails = await nativeRampService.getUserDetails(
                  accessToken,
                );

                if (userDetails.kyc?.l1?.status === 'APPROVED') {
                  // KYC was approved, proceed with the flow

                  setCurrentStep(6);
                  setIsLoading(false);
                  return;
                }

                retries++;
                if (retries >= maxRetries) {
                  throw new Error('KYC approval timeout reached.');
                }

                // Update loading message with attempt count
                setLoadingMessage(
                  `Waiting for KYC approval... Attempt ${retries}`,
                );

                // Schedule next poll
                setTimeout(pollKycStatus, pollInterval);
              } catch (error: unknown) {
                Alert.alert('Error', getErrorMessage(error));
                setIsLoading(false);
              }
            };

            // Start the first poll
            pollKycStatus();
          } else {
            setCurrentStep(6);
            await fetchKycForms(accessToken);
            setIsLoading(false);
            return;
          }
        } else {
          setCurrentStep(6);
          await fetchKycForms(accessToken);
          setIsLoading(false);
          return;
        }
      } else {
        // Handle next regular form as before
        setLoadingMessage('Loading next form...');
        const nextForm = forms[currentFormIndex + 1];
        const formDetails = await nativeRampService.getKycForm(
          accessToken,
          quote as BuyQuote,
          nextForm,
        );
        setCurrentFormFields(formDetails.fields || []);
        setCurrentFormIndex(currentFormIndex + 1);
        setFormValues({});
      }
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      if (currentFormIndex !== forms.length - 1) {
        setIsLoading(false);
        setLoadingMessage('');
      }
    }
  };

  const handleConfirmBankTransfer = async () => {
    if (!accessToken || !orderData || !sepaData) return;
    try {
      setIsLoading(true);
      setLoadingMessage('Confirming payment...');
      await nativeRampService.confirmPayment(accessToken, orderData, sepaData);

      // Start polling for order completion
      let retries = 0;
      const maxRetries = 20; // 10 minutes max wait time
      const pollInterval = 30000; // 30 seconds

      const pollOrderStatus = async () => {
        try {
          const updatedOrder = await nativeRampService.getOrder(
            accessToken,
            orderData.id,
          );

          if (updatedOrder.status === 'COMPLETED') {
            setOrderData(updatedOrder);
            setCurrentStep(8);
            setIsLoading(false);
            return;
          }

          retries++;
          if (retries === 10) {
            Alert.alert(
              'Payment not detected',
              "We haven't detected your payment yet. Would you like to review the bank details again?",
              [
                {
                  text: 'Keep waiting',
                  onPress: () => setTimeout(pollOrderStatus, pollInterval),
                },
                {
                  text: 'Show bank details',
                  onPress: () => {
                    setCurrentStep(7);
                    setIsLoading(false);
                  },
                },
              ],
            );
            return;
          }

          if (retries >= maxRetries) {
            throw new Error('Order completion timeout reached.');
          }

          setLoadingMessage(
            `Checking payment status... Attempt ${retries} of ${maxRetries}`,
          );
          setTimeout(pollOrderStatus, pollInterval);
        } catch (error) {
          console.error('Error polling order status:', error);
          Alert.alert('Error', getErrorMessage(error));
          setIsLoading(false);
        }
      };

      pollOrderStatus();
    } catch (error) {
      console.error('Error confirming payment:', error);
      Alert.alert('Error', getErrorMessage(error));
      setIsLoading(false);
      setLoadingMessage('');
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
              setCurrentStep(6);
              await fetchKycForms(tokenResult.token); // Still need quote for the next steps
            } else {
              await fetchKycForms(tokenResult.token);
              setCurrentStep(5);
            }
          } catch (error) {
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
      case 8:
        navigation.goBack();
        break;
    }
  };

  const renderDepositStep = () => (
    <>
      <View style={styles.inputContainerWrapper}>
        <View style={styles.inputContainer}>
          <TextInput
            ref={amountInputRef}
            style={styles.textInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={colors.text.default}
            keyboardType={'numeric'}
            testID={AmountViewSelectorsIDs.AMOUNT_INPUT}
          />
          <Text style={styles.currencyText}>EUR</Text>
        </View>
      </View>
      {/* Dev only button */}
      <Row style={styles.devButtonContainer}>
        <Text
          variant={TextVariant.BodySM}
          style={styles.devButtonText}
          onPress={resetTransakToken}
        >
          reset auth token (only for testing)
        </Text>
      </Row>
    </>
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
              placeholder={
                field.name.toLowerCase().includes('date of birth')
                  ? 'MM-DD-YYYY'
                  : field.name.toLowerCase().includes('mobile number')
                  ? '5491161738392 (with country code)'
                  : field.name.toLowerCase().includes('country')
                  ? 'Country code (e.g. US, DE, etc.)'
                  : field.name
              }
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

  const renderConfirmationScreen = () => {
    if (!orderData || !sepaData) return null;
    return (
      <>
        <Row style={styles.confirmationAmountContainer}>
          <Text
            variant={TextVariant.HeadingLG}
            style={styles.confirmationAmount}
          >
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
              {(sepaData.fields?.find((f) => f.name === 'Account Type') as any)
                ?.value || ''}
            </Text>
          </Row>

          <Row style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD}>Beneficiary Name</Text>
            <Text variant={TextVariant.BodyMD}>
              {`${
                (
                  sepaData.fields?.find(
                    (f) => f.name === 'First Name (Beneficiary)',
                  ) as any
                )?.value || ''
              } ${
                (
                  sepaData.fields?.find(
                    (f) => f.name === 'Last Name (Beneficiary)',
                  ) as any
                )?.value || ''
              }`}
            </Text>
          </Row>

          <Row style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD}>IBAN</Text>
            <Text variant={TextVariant.BodyMD}>
              {(sepaData.fields?.find((f) => f.name === 'IBAN') as any)
                ?.value || ''}
            </Text>
          </Row>

          <Row style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD}>Bank Name</Text>
            <Text variant={TextVariant.BodyMD}>
              {(sepaData.fields?.find((f) => f.name === 'Bank Name') as any)
                ?.value || ''}
            </Text>
          </Row>

          <Row style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD}>Bank Country</Text>
            <Text variant={TextVariant.BodyMD}>
              {(sepaData.fields?.find((f) => f.name === 'Bank Country') as any)
                ?.value || ''}
            </Text>
          </Row>

          <Row style={[styles.detailRow, styles.totalRow]}>
            <Text variant={TextVariant.BodyMD}>Bank Address</Text>
            <Text variant={TextVariant.BodyMD} style={styles.bankAddress}>
              {(sepaData.fields?.find((f) => f.name === 'Bank Address') as any)
                ?.value || ''}
            </Text>
          </Row>
        </View>
      </>
    );
  };

  const renderLoadingScreen = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary.default} />
      <Text variant={TextVariant.BodyMD} style={styles.loadingText}>
        {loadingMessage || 'Loading...'}
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
          <Text variant={TextVariant.BodyMD}>
            {orderData?.walletAddress
              ? `${orderData.walletAddress.slice(
                  0,
                  6,
                )}...${orderData.walletAddress.slice(-4)}`
              : 'Address'}
          </Text>
        </Row>

        <Row style={styles.detailRow}>
          <Text variant={TextVariant.BodyMD}>Order date</Text>
          <Text variant={TextVariant.BodyMD}>
            {orderData?.completedAt
              ? new Date(orderData.completedAt).toLocaleString()
              : 'Date'}
          </Text>
        </Row>

        <Row style={styles.detailRow}>
          <Text variant={TextVariant.BodyMD}>Paid with</Text>
          <View style={styles.detailRowEnd}>
            <Text variant={TextVariant.BodyMD}>
              {orderData?.paymentOptionId === 'sepa_bank_transfer'
                ? 'SEPA Bank Transfer'
                : orderData?.paymentOptionId || 'Payment method'}
            </Text>
          </View>
        </Row>

        <Row style={styles.detailRow}>
          <Text variant={TextVariant.BodyMD}>Total fees</Text>
          <Text variant={TextVariant.BodyMD}>
            {orderData?.totalFeeInFiat
              ? `€${orderData.totalFeeInFiat}`
              : '€0.00'}
          </Text>
        </Row>

        <Row style={[styles.detailRow, styles.totalRow]}>
          <Text variant={TextVariant.BodyMD}>Purchase amount total</Text>
          <Text variant={TextVariant.BodyMD}>
            €{orderData?.fiatAmount || amount}
          </Text>
        </Row>
      </View>

      {orderData?.transactionHash && (
        <Row style={styles.etherscanLink}>
          <Text
            variant={TextVariant.BodyMD}
            style={styles.linkText}
            onPress={() => {
              Linking.openURL(
                `https://etherscan.io/tx/${orderData.transactionHash}`,
              );
            }}
          >
            View on Etherscan
          </Text>
        </Row>
      )}
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScreenLayout>
        <ScreenLayout.Body>
          {currentStep >= 3 && currentStep < 6 && (
            <Row style={styles.progressBarContainer}>
              <ProgressBar percentComplete={(currentStep - 2) * 25} />
            </Row>
          )}
          <ScrollView
            contentContainerStyle={styles.scrollContentContainer}
            keyboardShouldPersistTaps="handled"
          >
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
                  {currentStep === 5.5 && renderLoadingScreen()}
                  {currentStep === 6 && renderKycSuccessScreen()}
                  {currentStep === 7 && renderConfirmationScreen()}
                  {currentStep === 8 && renderOrderSuccess()}
                </>
              )}
            </ScreenLayout.Content>
          </ScrollView>
        </ScreenLayout.Body>

        <ScreenLayout.Footer>
          <ScreenLayout.Content>
            <Row style={styles.cta}>
              <StyledButton
                type="confirm"
                onPress={handleContinue}
                loading={isLoading}
              >
                {currentStep === 8
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
    </KeyboardAvoidingView>
  );
}

export default NativeRamp;
