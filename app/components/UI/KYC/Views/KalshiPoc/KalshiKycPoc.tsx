/**
 * POC: registers a Kalshi user through the generalized KYC module.
 *
 * Throwaway demo screen. It drives `KycController` directly for the `kalshi`
 * vendor: terms first (idOS + SumSub documents for the user's country), then
 * MetaMask MFA, then the relay registers the Kalshi user and the screen renders
 * whatever `currentStep` the relay asks for next (Kalshi's email and phone
 * codes, consents), and a sandbox button forces the approval.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type {
  KycCatalogDocument,
  KycConsentDocument,
  KycConsentRecord,
  KycSessionStatus,
} from '@metamask/kyc-controller';
import Engine from '../../../../../core/Engine';
import type { RootState } from '../../../../../reducers';
import { selectKycSessionStatus } from '../../../../../selectors/kycController';
import { useMfa } from '../../../../../util/identity/mfa';

const VENDOR = 'kalshi' as const;
const KYC_API_URL =
  process.env.KYC_API_URL || 'https://kyc-api.uat-api.cx.metamask.io';
const POLL_MS = 4000;

type Stage = 'terms' | 'details' | 'flow';

interface Terms {
  idOS: KycCatalogDocument[];
  kycProvider: KycCatalogDocument[];
}

const toRecords = (
  documents: (KycCatalogDocument | KycConsentDocument)[],
): KycConsentRecord[] => documents.map(({ key, version }) => ({ key, version }));

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const KalshiKycPoc = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { verifyOrEnroll } = useMfa();
  const session = useSelector((state: RootState) =>
    selectKycSessionStatus(state, VENDOR),
  ) as (KycSessionStatus & { vendorUserId?: string; onboardingStatus?: string }) | null;

  const [stage, setStage] = useState<Stage>(session ? 'flow' : 'terms');
  const [terms, setTerms] = useState<Terms | null>(null);
  const [accepted, setAccepted] = useState<Terms | null>(null);
  const [email, setEmail] = useState('');
  const [aal2Token, setAal2Token] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [newDocuments, setNewDocuments] = useState<KycConsentDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consentsHandled = useRef(false);
  const authorizationAttempted = useRef(false);

  const run = useCallback(async (label: string, work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (workError) {
      setError(`${label}: ${errorText(workError)}`);
    } finally {
      setBusy(false);
    }
  }, []);

  // Step 1: the idOS + SumSub documents for the user's country.
  useEffect(() => {
    if (stage !== 'terms' || terms) {
      return;
    }
    run('Load terms', async () => {
      const country = await Engine.context.KycService?.getGeoCountry();
      if (!country) {
        throw new Error('No country');
      }
      const catalog = (await Engine.context.KycController.fetchSessionDisclaimers(
        { country },
      )) as Terms;
      setTerms({ idOS: catalog.idOS, kycProvider: catalog.kycProvider });
    });
  }, [run, stage, terms]);

  // Poll the Kalshi session while the relay drives the flow.
  const currentStep = session?.currentStep;
  const finished = currentStep === 'approved' || currentStep === 'rejected';
  useEffect(() => {
    if (stage !== 'flow' || !session || finished) {
      return undefined;
    }
    const timer = setInterval(() => {
      Engine.context.KycController.fetchSessionStatusOnce({
        vendor: VENDOR,
      }).catch(() => undefined);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [finished, session, stage]);

  // `capabilityAuthorization`: resuming the session re-submits it.
  useEffect(() => {
    if (
      stage === 'flow' &&
      currentStep === 'capabilityAuthorization' &&
      !authorizationAttempted.current
    ) {
      authorizationAttempted.current = true;
      run('Authorize', async () => {
        await Engine.context.KycController.startSession({ vendor: VENDOR });
      });
    }
  }, [currentStep, run, stage]);

  // `consents`: submit the terms accepted up front; ask only for new ones.
  useEffect(() => {
    if (stage !== 'flow' || currentStep !== 'consents' || consentsHandled.current) {
      return;
    }
    consentsHandled.current = true;
    run('Consents', async () => {
      const catalog = (await Engine.context.KycController.fetchSessionDisclaimers(
        { vendor: VENDOR },
      )) as { idOS: KycConsentDocument[]; kycProvider: KycConsentDocument[] };
      const acceptedKeys = new Set(
        [...(accepted?.idOS ?? []), ...(accepted?.kycProvider ?? [])].map(
          (document) => `${document.key}@${document.version}`,
        ),
      );
      const unseen = [...catalog.idOS, ...catalog.kycProvider].filter(
        (document) =>
          !document.consented &&
          !acceptedKeys.has(`${document.key}@${document.version}`),
      );
      if (unseen.length) {
        setNewDocuments(unseen);
        return;
      }
      await Engine.context.KycController.recordSessionDisclaimers({
        vendor: VENDOR,
        idosDisclaimersAccepted: toRecords(catalog.idOS),
        providerDisclaimersAccepted: toRecords(catalog.kycProvider),
        credentialReusabilityConsentGiven: false,
      });
      await Engine.context.KycController.fetchSessionStatusOnce({
        vendor: VENDOR,
      });
    });
  }, [accepted, currentStep, run, stage]);

  const acceptNewDocuments = () =>
    run('Consents', async () => {
      const catalog = (await Engine.context.KycController.fetchSessionDisclaimers(
        { vendor: VENDOR },
      )) as { idOS: KycConsentDocument[]; kycProvider: KycConsentDocument[] };
      await Engine.context.KycController.recordSessionDisclaimers({
        vendor: VENDOR,
        idosDisclaimersAccepted: toRecords(catalog.idOS),
        providerDisclaimersAccepted: toRecords(catalog.kycProvider),
        credentialReusabilityConsentGiven: false,
      });
      setNewDocuments([]);
      await Engine.context.KycController.fetchSessionStatusOnce({
        vendor: VENDOR,
      });
    });

  // MetaMask MFA first; its verified email prefills the Kalshi account email.
  const verifyWithMetaMask = () =>
    run('MetaMask MFA', async () => {
      const result = await verifyOrEnroll({
        methods: ['email_otp'],
        verifyWith: 'email_otp',
        reason: { operation: 'kalshi.poc', presentation: 'card' },
      });
      const token = result.token?.accessToken;
      if (!token) {
        throw new Error('MFA returned no token');
      }
      const verifiedEmail = result.credentials?.find(
        (credential) => credential.type === 'email_otp',
      ) as { email?: string } | undefined;
      setAal2Token(token);
      setEmail((current) => current || verifiedEmail?.email || '');
    });

  const startKalshiSession = () =>
    run('Create Kalshi user', async () => {
      if (!aal2Token) {
        throw new Error('Verify with MetaMask first');
      }
      await Engine.context.KycController.startSession({
        vendor: VENDOR,
        aal2Token,
        email: email.trim(),
      });
      setStage('flow');
    });

  const submitCode = (
    step: 'email' | 'phone',
    method: 'verifyVendorEmailOtp' | 'verifyVendorPhoneOtp',
  ) =>
    run(`Verify ${step} code`, async () => {
      await Engine.context.KycController[method]({
        vendor: VENDOR,
        otp: code.trim(),
      });
      setCode('');
    });

  const sendPhoneCode = () =>
    run('Send phone code', async () => {
      await Engine.context.KycController.sendVendorPhoneOtp({
        vendor: VENDOR,
        phoneNumber: phone.trim(),
      });
      setPhoneCodeSent(true);
    });

  const forceApprove = () =>
    run('Force approve', async () => {
      const token =
        await Engine.context.AuthenticationController.getBearerToken();
      const response = await fetch(
        `${KYC_API_URL}/sandbox/sessions/latest/${VENDOR}/event`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ event: 'approve_kyc' }),
        },
      );
      if (!response.ok) {
        throw new Error(`${response.status} ${await response.text()}`);
      }
      await Engine.context.KycController.fetchSessionStatusOnce({
        vendor: VENDOR,
      });
    });

  const launchSumSub = () =>
    run('SumSub', async () => {
      await Engine.context.KycController.launchProviderFlow({
        vendor: VENDOR,
      });
    });

  const input = (
    value: string,
    onChange: (text: string) => void,
    placeholder: string,
    keyboard: 'default' | 'email-address' | 'phone-pad' | 'number-pad',
  ) => (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType={keyboard}
      style={tw.style(
        'border border-muted rounded-lg px-4 py-3 text-default bg-default mb-3',
      )}
    />
  );

  const documentLinks = (documents: KycCatalogDocument[]) =>
    documents.map((document) => (
      <TextButton
        key={`${document.key}@${document.version}`}
        variant={TextVariant.BodyMd}
        onPress={() => Linking.openURL(document.url)}
      >
        {document.title}
      </TextButton>
    ));

  const renderTerms = () => (
    <Box twClassName="gap-3">
      <Text variant={TextVariant.HeadingMd}>1. Review the terms</Text>
      <Text color={TextColor.TextAlternative}>
        idOS and SumSub documents for your country. They are submitted once the
        Kalshi session reaches consents.
      </Text>
      {terms ? (
        <>
          {documentLinks(terms.idOS)}
          {documentLinks(terms.kycProvider)}
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={() => {
              setAccepted(terms);
              setStage('details');
            }}
          >
            Agree and continue
          </Button>
        </>
      ) : (
        <ActivityIndicator />
      )}
    </Box>
  );

  const renderDetails = () =>
    !aal2Token ? (
      <Box twClassName="gap-3">
        <Text variant={TextVariant.HeadingMd}>2. Verify with MetaMask</Text>
        <Text color={TextColor.TextAlternative}>
          MetaMask confirms it's you before any vendor account is created.
        </Text>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={busy}
          onPress={verifyWithMetaMask}
        >
          Verify with MetaMask
        </Button>
      </Box>
    ) : (
      <Box twClassName="gap-3">
        <Text variant={TextVariant.HeadingMd}>3. Your Kalshi account</Text>
        <Text color={TextColor.TextAlternative}>
          The relay registers this email at Kalshi. Prefilled from MetaMask; use
          a new +alias for each run.
        </Text>
        {input(email, setEmail, 'Email for the Kalshi account', 'email-address')}
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={!email.trim() || busy}
          isLoading={busy}
          onPress={startKalshiSession}
        >
          Create Kalshi user
        </Button>
      </Box>
    );

  const renderStep = () => {
    if (!session) {
      return <ActivityIndicator />;
    }
    if (newDocuments.length) {
      return (
        <Box twClassName="gap-3">
          <Text variant={TextVariant.HeadingMd}>Kalshi added documents</Text>
          {documentLinks(newDocuments)}
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isLoading={busy}
            onPress={acceptNewDocuments}
          >
            Accept
          </Button>
        </Box>
      );
    }
    switch (currentStep) {
      case 'emailOtpCollection':
        return (
          <Box twClassName="gap-3">
            <Text variant={TextVariant.HeadingMd}>Kalshi emailed you a code</Text>
            {input(code, setCode, 'Email code', 'number-pad')}
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isLoading={busy}
              onPress={() => submitCode('email', 'verifyVendorEmailOtp')}
            >
              Verify email
            </Button>
            <TextButton
              onPress={() =>
                run('Resend code', async () => {
                  await Engine.context.KycController.resendVendorEmailOtp({
                    vendor: VENDOR,
                  });
                })
              }
            >
              Resend code
            </TextButton>
          </Box>
        );
      case 'phoneOtpCollection':
        return (
          <Box twClassName="gap-3">
            <Text variant={TextVariant.HeadingMd}>Verify your phone with Kalshi</Text>
            {input(phone, setPhone, '+14155550100', 'phone-pad')}
            {!phoneCodeSent ? (
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                isFullWidth
                isLoading={busy}
                isDisabled={!phone.trim()}
                onPress={sendPhoneCode}
              >
                Send code
              </Button>
            ) : (
              <>
                {input(code, setCode, 'SMS code', 'number-pad')}
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.Lg}
                  isFullWidth
                  isLoading={busy}
                  onPress={() => submitCode('phone', 'verifyVendorPhoneOtp')}
                >
                  Verify phone
                </Button>
                <TextButton onPress={sendPhoneCode}>Send a new code</TextButton>
              </>
            )}
          </Box>
        );
      case 'kyc':
        return (
          <Box twClassName="gap-3">
            <Text variant={TextVariant.HeadingMd}>Identity verification</Text>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isLoading={busy}
              onPress={forceApprove}
            >
              Force approve (sandbox)
            </Button>
            <TextButton onPress={launchSumSub}>Open SumSub instead</TextButton>
          </Box>
        );
      case 'approved':
        return (
          <Box twClassName="gap-2">
            <Text variant={TextVariant.HeadingLg}>Kalshi user created</Text>
            <Text>Kalshi user id: {session.vendorUserId ?? 'not returned'}</Text>
            <Text>Session: {session.id}</Text>
            <Text>Status: {session.finalStatus}</Text>
          </Box>
        );
      case 'rejected':
        return (
          <Box twClassName="gap-2">
            <Text variant={TextVariant.HeadingLg}>Rejected</Text>
            <Text>{session.statusMessage ?? 'No message'}</Text>
          </Box>
        );
      default:
        return (
          <Box twClassName="gap-3">
            <Text variant={TextVariant.HeadingMd}>
              {currentStep === 'consents' ? 'Submitting your terms' : 'Kalshi is processing'}
            </Text>
            <ActivityIndicator />
          </Box>
        );
    }
  };

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        title="Kalshi KYC (POC)"
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScrollView contentContainerStyle={tw.style('p-4 gap-4')}>
        {stage === 'terms' && renderTerms()}
        {stage === 'details' && renderDetails()}
        {stage === 'flow' && renderStep()}
        {error ? <Text color={TextColor.ErrorDefault}>{error}</Text> : null}
        {session ? (
          <Box twClassName="mt-6 p-3 rounded-lg bg-muted gap-1">
            <Text variant={TextVariant.BodyXs}>vendor: {session.vendor}</Text>
            <Text variant={TextVariant.BodyXs}>currentStep: {currentStep}</Text>
            <Text variant={TextVariant.BodyXs}>
              onboardingStatus: {session.onboardingStatus ?? '-'}
            </Text>
            <Text variant={TextVariant.BodyXs}>
              finalStatus: {session.finalStatus} · kycStatus: {session.kycStatus}
            </Text>
          </Box>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default KalshiKycPoc;
