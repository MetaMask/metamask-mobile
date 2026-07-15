import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  useObservableState,
  usePredictController,
} from '../../hooks/usePredictController';
import type { ProfileInput } from '../../types';

/**
 * Minimal canonical step renderer. Maps each `setupStep` from the session
 * service to a tiny form. Demo fast-path values are pre-filled so an agent
 * can rip through the flow without typing.
 */
export const AccountSetupView: React.FC<{ ownerAddress: string }> = ({ ownerAddress }) => {
  const controller = usePredictController();
  const session = useObservableState(controller.session);
  const setup = session.setup;
  const submitting = session.isSubmittingStep;
  const error = session.setupError;

  const [email, setEmail] = useState(`metamask-poc-${Date.now()}@example.com`);
  const [otp, setOtp] = useState('888888');
  const [linkOtp, setLinkOtp] = useState('');
  const [profile, setProfile] = useState<ProfileInput>(DEMO_PROFILE);

  useEffect(() => {
    controller.session.resumeAccountSetup(ownerAddress).catch(() => undefined);
  }, [controller.session, ownerAddress]);

  return (
    <View>
      <Text style={styles.title}>Step: {setup.setupStep}</Text>
      {setup.path && <Text style={styles.meta}>Path: {setup.path}</Text>}
      {setup.kalshiUserId && <Text style={styles.meta}>kalshi_user_id: {setup.kalshiUserId}</Text>}
      {setup.obfuscatedDestination && (
        <Text style={styles.meta}>2FA sent to: {setup.obfuscatedDestination}</Text>
      )}

      {setup.setupStep === 'email_otp' && !setup.kalshiUserId && (
        <View>
          <Field label="email" value={email} onChange={setEmail} />
          <Action
            label={submitting ? 'starting…' : 'Start (POST /create)'}
            onPress={() =>
              controller.session.startAccountSetup({ ownerAddress, email }).catch(() => undefined)
            }
            disabled={submitting}
          />
        </View>
      )}

      {setup.setupStep === 'email_otp' && setup.kalshiUserId && (
        <View>
          <Field label="email OTP" value={otp} onChange={setOtp} />
          <Action
            label={submitting ? 'verifying…' : 'Verify email'}
            onPress={() =>
              controller.session
                .submitAccountSetupStep(ownerAddress, { step: 'email_otp', code: otp })
                .catch(() => undefined)
            }
            disabled={submitting}
          />
          <Action
            label="Resend email"
            onPress={() =>
              controller.session
                .submitAccountSetupStep(ownerAddress, { step: 'resend_email' })
                .catch(() => undefined)
            }
            disabled={submitting}
          />
        </View>
      )}

      {setup.setupStep === 'profile_form' && (
        <ProfileForm
          profile={profile}
          onChange={setProfile}
          disabled={submitting}
          onSubmit={() =>
            controller.session
              .submitAccountSetupStep(ownerAddress, { step: 'profile_form', profile })
              .catch(() => undefined)
          }
        />
      )}

      {setup.setupStep === 'phone_otp' && (
        <View>
          <Field label="phone OTP" value={otp} onChange={setOtp} />
          <Action
            label={submitting ? 'verifying…' : 'Verify phone'}
            onPress={() =>
              controller.session
                .submitAccountSetupStep(ownerAddress, { step: 'phone_otp', code: otp })
                .catch(() => undefined)
            }
            disabled={submitting}
          />
          <Action
            label="Resend phone OTP"
            onPress={() =>
              controller.session
                .submitAccountSetupStep(ownerAddress, { step: 'resend_phone' })
                .catch(() => undefined)
            }
            disabled={submitting}
          />
        </View>
      )}

      {setup.setupStep === 'link_verify' && (
        <View>
          <Text style={styles.meta}>Link verification (Path B)</Text>
          <Field label="link OTP" value={linkOtp} onChange={setLinkOtp} />
          <Action
            label={submitting ? 'verifying…' : 'Verify link'}
            onPress={() =>
              controller.session
                .submitAccountSetupStep(ownerAddress, { step: 'link_verify', code: linkOtp })
                .catch(() => undefined)
            }
            disabled={submitting}
          />
        </View>
      )}

      {setup.setupStep === 'kyc' && (
        <Text style={styles.meta}>KYC pending. Refresh to retry.</Text>
      )}

      {setup.setupStep === 'complete' && (
        <Text style={styles.success}>✓ Setup complete — per-user PEM minted.</Text>
      )}

      {error && (
        <View style={styles.error}>
          <Text style={styles.errorText}>
            {error.code}: {error.message}
          </Text>
        </View>
      )}
    </View>
  );
};

const ProfileForm: React.FC<{
  profile: ProfileInput;
  onChange: (next: ProfileInput) => void;
  onSubmit: () => void;
  disabled: boolean;
}> = ({ profile, onChange, onSubmit, disabled }) => (
  <View>
    <Field
      label="first"
      value={profile.firstName}
      onChange={(v) => onChange({ ...profile, firstName: v })}
    />
    <Field
      label="last"
      value={profile.lastName}
      onChange={(v) => onChange({ ...profile, lastName: v })}
    />
    <Field
      label="DOB"
      value={profile.dateOfBirth}
      onChange={(v) => onChange({ ...profile, dateOfBirth: v })}
    />
    <Field
      label="phone"
      value={profile.phoneNumber}
      onChange={(v) => onChange({ ...profile, phoneNumber: v })}
    />
    <Field
      label="SSN"
      value={profile.ssn}
      onChange={(v) => onChange({ ...profile, ssn: v })}
    />
    <Action
      label={disabled ? 'submitting…' : 'Submit profile & send phone OTP'}
      onPress={onSubmit}
      disabled={disabled}
    />
  </View>
);

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({
  label,
  value,
  onChange,
}) => (
  <View style={styles.row}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.fieldInput}
      value={value}
      onChangeText={onChange}
      autoCapitalize="none"
      autoCorrect={false}
    />
  </View>
);

const Action: React.FC<{ label: string; onPress: () => void; disabled?: boolean }> = ({
  label,
  onPress,
  disabled,
}) => (
  <TouchableOpacity
    style={[styles.btn, disabled && styles.btnDisabled]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={styles.btnText}>{label}</Text>
  </TouchableOpacity>
);

const DEMO_PROFILE: ProfileInput = {
  firstName: 'test trigger',
  lastName: 'approved',
  dateOfBirth: '1990-01-01',
  phoneNumber: '+18888888888',
  ssn: '777777777',
  address: {
    line1: '123 Test St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'US',
  },
};

const styles = StyleSheet.create({
  title: { color: '#fff', fontSize: 16, marginBottom: 4 },
  meta: { color: '#9aa4b2', fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  fieldLabel: { color: '#9aa4b2', width: 80, fontSize: 12 },
  fieldInput: {
    flex: 1,
    backgroundColor: '#161b22',
    color: '#fff',
    padding: 6,
    borderRadius: 4,
  },
  btn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 6,
  },
  btnDisabled: { backgroundColor: '#374151' },
  btnText: { color: '#fff', fontWeight: '600' },
  success: { color: '#34d399', marginTop: 12 },
  error: { backgroundColor: '#7f1d1d', padding: 8, borderRadius: 6, marginTop: 12 },
  errorText: { color: '#fff' },
});
