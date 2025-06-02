import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { useDepositSDK } from '../../sdk';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';

const mockQuote: BuyQuote = {
  quoteId: 'mock-quote-id',
  conversionPrice: 2000,
  marketConversionPrice: 1980,
  slippage: 0.05,
  fiatCurrency: 'USD',
  cryptoCurrency: 'ETH',
  paymentMethod: 'credit_card',
  fiatAmount: 1000,
  cryptoAmount: 0.5,
  isBuyOrSell: 'buy',
  network: 'mainnet',
  feeDecimal: 0.01,
  totalFee: 10,
  feeBreakdown: [],
  nonce: Date.now(),
  cryptoLiquidityProvider: 'mock-provider',
  notes: [],
};

const Root = () => {
  const navigation = useNavigation();

  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const { checkExistingToken } = useDepositSDK();
  const { response: userDetails, sdkMethod: getUserDetails } =
    useDepositSdkMethod('getUserDetails');
  const { response: kycForms, sdkMethod: getKYCForms } = useDepositSdkMethod(
    'getKYCForms',
    mockQuote,
  );
  const hasInitialized = useRef(false);

  useEffect(() => {
    // For now we'll assume there is a quote that the user needs to complete
    const initializeFlow = async () => {
      try {
        if (hasInitialized.current) return;
        let route = Routes.DEPOSIT.BUILD_QUOTE;
        const hasToken = await checkExistingToken();
        hasInitialized.current = true;

        if (hasToken) {
          await getUserDetails();
          if (userDetails?.isKycApproved()) {
            setInitialRoute(Routes.DEPOSIT.ORDER_CONFIRMATION);
          } else {
            await getKYCForms();

            if (kycForms) {
              const purposeOfUsageForm = kycForms.forms.find(
                (form) => form.id === 'purposeOfUsage',
              );
              const foundIdProofForm = kycForms.forms.find(
                (form) => form.id === 'idProof',
              );

              // Get regular forms (excluding special forms above)
              const filteredForms = kycForms.forms.filter(
                (form) =>
                  ![purposeOfUsageForm?.id, foundIdProofForm?.id].includes(
                    form.id,
                  ),
              );

              if (filteredForms?.length > 0) {
                route = Routes.DEPOSIT.VERIFY_IDENTITY;
              } else {
                route = Routes.DEPOSIT.BASIC_INFO;
              }
            }
          }
        } else {
          hasInitialized.current = true;
          route = Routes.DEPOSIT.BUILD_QUOTE;
        }

        hasInitialized.current = true;
        setInitialRoute(route);
      } catch (error) {
        hasInitialized.current = true;
        setInitialRoute(Routes.DEPOSIT.BUILD_QUOTE);
      }
    };

    initializeFlow();
  }, [checkExistingToken, getKYCForms, getUserDetails, kycForms, userDetails]);

  useEffect(() => {
    if (initialRoute === null) return;
    navigation.reset({
      index: 0,
      routes: [
        {
          name: initialRoute,
          params: { animationEnabled: false },
        },
      ],
    });
  });

  return null;
};

export default Root;
