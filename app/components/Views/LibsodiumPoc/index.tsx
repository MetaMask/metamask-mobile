import React, { useCallback, useState } from 'react';
import { ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
  HeaderStandard,
} from '@metamask/design-system-react-native';
import _sodium from 'libsodium-wrappers';
import _rnSodium from 'react-native-libsodium';

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
  iterations: number;
  avgMs: number | null;
}

const GENERICHASH_TEST_VECTOR =
  '928b20366943e2afd11ebc0eae2e53a93bf177a4fcf35bcc64d503704e65e202';

/**
 * High-resolution clock when available (Hermes/RN expose `performance.now()`),
 * falling back to `Date.now()` for coarse millisecond timing.
 */
const now = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

/**
 * Builds a `check(name, fn)` helper that runs `fn` `iterations` times, records
 * pass/fail into `collected`, and reports the average execution time per run.
 * Timing stops at the first failing iteration.
 */
const makeCheck =
  (collected: CheckResult[], iterations: number) =>
  (name: string, fn: () => string | void) => {
    try {
      let detail = 'ok';
      const start = now();
      for (let i = 0; i < iterations; i++) {
        detail = fn() || 'ok';
      }
      const total = now() - start;
      collected.push({
        name,
        ok: true,
        detail,
        iterations,
        avgMs: total / iterations,
      });
    } catch (err) {
      collected.push({
        name,
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
        iterations,
        avgMs: null,
      });
    }
  };

/**
 * Formats an average duration in ms with resolution appropriate to its size.
 */
const formatAvg = (avgMs: number): string => {
  if (avgMs >= 100) {
    return `${avgMs.toFixed(0)} ms`;
  }
  if (avgMs >= 1) {
    return `${avgMs.toFixed(2)} ms`;
  }
  return `${avgMs.toFixed(4)} ms`;
};

/**
 * Proof-of-concept screen that exercises two libsodium bindings inside the
 * React Native (Hermes) runtime and reports whether each cryptographic
 * primitive round-trips correctly. The bindings are libsodium-wrappers
 * (pure-JS / WebAssembly) and react-native-libsodium (native JSI bindings).
 */
const LibsodiumPoc = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [engine, setEngine] = useState<string | null>(null);
  const [iterationsInput, setIterationsInput] = useState('1');

  const parseIterations = useCallback(() => {
    const parsed = parseInt(iterationsInput, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [iterationsInput]);

  /**
   * libsodium-wrappers (pure-JS / WebAssembly) — full wrapper API, including
   * string helpers and the secretstream construction.
   */
  const runJsChecks = useCallback(async () => {
    setRunning(true);
    setResults([]);
    setSummary(null);
    setEngine(null);

    const iterations = parseIterations();
    const collected: CheckResult[] = [];
    const check = makeCheck(collected, iterations);

    try {
      await _sodium.ready;
      const sodium = _sodium;

      setEngine(
        `libsodium-wrappers ${sodium.sodium_version_string()} · ${
          typeof WebAssembly === 'undefined'
            ? 'pure-JS (asm.js backup — no WebAssembly)'
            : 'WebAssembly available'
        }`,
      );

      check('helpers: hex round-trip', () => {
        const bytes = sodium.from_hex('deadbeef');
        if (sodium.to_hex(bytes) !== 'deadbeef') {
          throw new Error('hex mismatch');
        }
        return 'deadbeef -> bytes -> deadbeef';
      });

      check('helpers: utf-8 string round-trip', () => {
        const s = 'héllo libsodium 🔐';
        if (sodium.to_string(sodium.from_string(s)) !== s) {
          throw new Error('string mismatch');
        }
        return s;
      });

      check('helpers: base64 round-trip', () => {
        const b = sodium.from_string('metamask');
        const b64 = sodium.to_base64(b);
        if (sodium.to_hex(sodium.from_base64(b64)) !== sodium.to_hex(b)) {
          throw new Error('base64 mismatch');
        }
        return b64;
      });

      check('randombytes_buf(32)', () => {
        const r = sodium.randombytes_buf(32);
        if (!(r instanceof Uint8Array) || r.length !== 32) {
          throw new Error('bad random buffer');
        }
        return `len=${r.length}`;
      });

      check('crypto_generichash (BLAKE2b) known vector', () => {
        const h = sodium.crypto_generichash(
          32,
          sodium.from_string('test'),
          null,
        );
        if (sodium.to_hex(h) !== GENERICHASH_TEST_VECTOR) {
          throw new Error(`got ${sodium.to_hex(h)}`);
        }
        return GENERICHASH_TEST_VECTOR.slice(0, 16) + '…';
      });

      check('crypto_secretbox: encrypt/decrypt round-trip', () => {
        const key = sodium.crypto_secretbox_keygen();
        const nonce = sodium.randombytes_buf(
          sodium.crypto_secretbox_NONCEBYTES,
        );
        const ct = sodium.crypto_secretbox_easy(
          sodium.from_string('secretbox message'),
          nonce,
          key,
        );
        const pt = sodium.crypto_secretbox_open_easy(ct, nonce, key);
        if (sodium.to_string(pt) !== 'secretbox message') {
          throw new Error('decrypt mismatch');
        }
        return 'decrypted ok';
      });

      check('crypto_secretbox: tampered ciphertext rejected', () => {
        const key = sodium.crypto_secretbox_keygen();
        const nonce = sodium.randombytes_buf(
          sodium.crypto_secretbox_NONCEBYTES,
        );
        const ct = sodium.crypto_secretbox_easy(
          sodium.from_string('tamper me'),
          nonce,
          key,
        );
        ct[0] ^= 0xff;
        let threw = false;
        try {
          sodium.crypto_secretbox_open_easy(ct, nonce, key);
        } catch {
          threw = true;
        }
        if (!threw) {
          throw new Error('tampered ciphertext was accepted');
        }
        return 'rejected as expected';
      });

      check('crypto_box (X25519): public-key encryption', () => {
        const alice = sodium.crypto_box_keypair();
        const bob = sodium.crypto_box_keypair();
        const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
        const ct = sodium.crypto_box_easy(
          sodium.from_string('hello bob'),
          nonce,
          bob.publicKey,
          alice.privateKey,
        );
        const pt = sodium.crypto_box_open_easy(
          ct,
          nonce,
          alice.publicKey,
          bob.privateKey,
        );
        if (sodium.to_string(pt) !== 'hello bob') {
          throw new Error('decrypt mismatch');
        }
        return `keyType=${alice.keyType}`;
      });

      check('crypto_sign (Ed25519): sign/verify + reject bad', () => {
        const kp = sodium.crypto_sign_keypair();
        const msg = sodium.from_string('sign this');
        const sig = sodium.crypto_sign_detached(msg, kp.privateKey);
        if (!sodium.crypto_sign_verify_detached(sig, msg, kp.publicKey)) {
          throw new Error('valid signature rejected');
        }
        sig[0] ^= 0xff;
        if (sodium.crypto_sign_verify_detached(sig, msg, kp.publicKey)) {
          throw new Error('invalid signature accepted');
        }
        return `keyType=${kp.keyType}`;
      });

      check('crypto_secretstream_xchacha20poly1305 round-trip', () => {
        const key = sodium.crypto_secretstream_xchacha20poly1305_keygen();
        const { state: sOut, header } =
          sodium.crypto_secretstream_xchacha20poly1305_init_push(key);
        const c1 = sodium.crypto_secretstream_xchacha20poly1305_push(
          sOut,
          sodium.from_string('message 1'),
          null,
          sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE,
        );
        const c2 = sodium.crypto_secretstream_xchacha20poly1305_push(
          sOut,
          sodium.from_string('message 2'),
          null,
          sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL,
        );
        const sIn = sodium.crypto_secretstream_xchacha20poly1305_init_pull(
          header,
          key,
        );
        const r1 = sodium.crypto_secretstream_xchacha20poly1305_pull(
          sIn,
          c1,
          null,
        );
        const r2 = sodium.crypto_secretstream_xchacha20poly1305_pull(
          sIn,
          c2,
          null,
        );
        if (r1 === false || r2 === false) {
          throw new Error('stream pull failed (bad tag/ciphertext)');
        }
        if (
          sodium.to_string(r1.message) !== 'message 1' ||
          sodium.to_string(r2.message) !== 'message 2'
        ) {
          throw new Error('stream decrypt mismatch');
        }
        return '2 messages decrypted';
      });

      const passed = collected.filter((r) => r.ok).length;
      setResults(collected);
      setSummary(
        `${passed}/${collected.length} checks passed · ${iterations}× each`,
      );
    } catch (err) {
      setResults(collected);
      setSummary(
        `libsodium-wrappers failed to initialize: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    } finally {
      setRunning(false);
    }
  }, [parseIterations]);

  /**
   * react-native-libsodium (native JSI). Its native binding exposes a curated
   * subset of the API — notably no string helpers (`from_string`/`from_hex`),
   * no `sodium_version_string`, and no secretstream — but it does include the
   * native `crypto_pwhash` (Argon2). Checks below stick to that subset and pass
   * JS strings directly where the wrapper would normally take a `from_string`
   * buffer.
   */
  const runNativeChecks = useCallback(async () => {
    setRunning(true);
    setResults([]);
    setSummary(null);
    setEngine(null);

    const iterations = parseIterations();
    const collected: CheckResult[] = [];
    const check = makeCheck(collected, iterations);

    try {
      await _rnSodium.ready;
      const sodium = _rnSodium;

      setEngine('react-native-libsodium (native JSI) · libsodium 1.0.21');

      check('helpers: base64 round-trip', () => {
        const b = sodium.randombytes_buf(16);
        const b64 = sodium.to_base64(b);
        if (sodium.to_hex(sodium.from_base64(b64)) !== sodium.to_hex(b)) {
          throw new Error('base64 mismatch');
        }
        return b64;
      });

      check('randombytes_buf(32)', () => {
        const r = sodium.randombytes_buf(32);
        if (!(r instanceof Uint8Array) || r.length !== 32) {
          throw new Error('bad random buffer');
        }
        return `len=${r.length}`;
      });

      check('crypto_generichash (BLAKE2b) known vector', () => {
        // Native accepts JS strings directly (UTF-8), matching from_string.
        const h = sodium.crypto_generichash(32, 'test', null);
        if (sodium.to_hex(h) !== GENERICHASH_TEST_VECTOR) {
          throw new Error(`got ${sodium.to_hex(h)}`);
        }
        return GENERICHASH_TEST_VECTOR.slice(0, 16) + '…';
      });

      check('crypto_secretbox: encrypt/decrypt round-trip', () => {
        const key = sodium.crypto_secretbox_keygen();
        const nonce = sodium.randombytes_buf(
          sodium.crypto_secretbox_NONCEBYTES,
        );
        const ct = sodium.crypto_secretbox_easy(
          'secretbox message',
          nonce,
          key,
        );
        const pt = sodium.crypto_secretbox_open_easy(ct, nonce, key);
        if (sodium.to_string(pt) !== 'secretbox message') {
          throw new Error('decrypt mismatch');
        }
        return 'decrypted ok';
      });

      check('crypto_secretbox: tampered ciphertext rejected', () => {
        const key = sodium.crypto_secretbox_keygen();
        const nonce = sodium.randombytes_buf(
          sodium.crypto_secretbox_NONCEBYTES,
        );
        const ct = sodium.crypto_secretbox_easy('tamper me', nonce, key);
        ct[0] ^= 0xff;
        let threw = false;
        try {
          sodium.crypto_secretbox_open_easy(ct, nonce, key);
        } catch {
          threw = true;
        }
        if (!threw) {
          throw new Error('tampered ciphertext was accepted');
        }
        return 'rejected as expected';
      });

      check('crypto_box (X25519): public-key encryption', () => {
        const alice = sodium.crypto_box_keypair();
        const bob = sodium.crypto_box_keypair();
        const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
        const ct = sodium.crypto_box_easy(
          'hello bob',
          nonce,
          bob.publicKey,
          alice.privateKey,
        );
        const pt = sodium.crypto_box_open_easy(
          ct,
          nonce,
          alice.publicKey,
          bob.privateKey,
        );
        if (sodium.to_string(pt) !== 'hello bob') {
          throw new Error('decrypt mismatch');
        }
        return `keyType=${alice.keyType}`;
      });

      check('crypto_sign (Ed25519): sign/verify + reject bad', () => {
        const kp = sodium.crypto_sign_keypair();
        const sig = sodium.crypto_sign_detached('sign this', kp.privateKey);
        if (
          !sodium.crypto_sign_verify_detached(sig, 'sign this', kp.publicKey)
        ) {
          throw new Error('valid signature rejected');
        }
        sig[0] ^= 0xff;
        if (
          sodium.crypto_sign_verify_detached(sig, 'sign this', kp.publicKey)
        ) {
          throw new Error('invalid signature accepted');
        }
        return `keyType=${kp.keyType}`;
      });

      check('crypto_pwhash (Argon2) deterministic — native only', () => {
        const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
        const k1 = sodium.crypto_pwhash(
          32,
          'correct horse battery staple',
          salt,
          sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
          sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
          sodium.crypto_pwhash_ALG_DEFAULT,
        );
        const k2 = sodium.crypto_pwhash(
          32,
          'correct horse battery staple',
          salt,
          sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
          sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
          sodium.crypto_pwhash_ALG_DEFAULT,
        );
        if (k1.length !== 32 || sodium.to_hex(k1) !== sodium.to_hex(k2)) {
          throw new Error('pwhash not deterministic');
        }
        return `derived ${k1.length}-byte key`;
      });

      const passed = collected.filter((r) => r.ok).length;
      setResults(collected);
      setSummary(
        `${passed}/${collected.length} checks passed · ${iterations}× each`,
      );
    } catch (err) {
      setResults(collected);
      setSummary(
        `react-native-libsodium failed to initialize: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    } finally {
      setRunning(false);
    }
  }, [parseIterations]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['top', 'left', 'right']}
      testID="libsodium-poc-screen"
    >
      <HeaderStandard
        title="libsodium POC"
        onBack={handleBack}
        includesTopInset={false}
      />
      <ScrollView contentContainerStyle={tw.style('p-4 gap-3')}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          Exercises two libsodium bindings inside the React Native runtime and
          reports whether each primitive round-trips correctly.
        </Text>

        <Box
          twClassName="flex-row items-center justify-between mt-1"
          testID="libsodium-poc-iterations-row"
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            Iterations per check
          </Text>
          <TextInput
            value={iterationsInput}
            onChangeText={(text) =>
              setIterationsInput(text.replace(/[^0-9]/g, ''))
            }
            onEndEditing={() => {
              if (!iterationsInput || parseInt(iterationsInput, 10) < 1) {
                setIterationsInput('1');
              }
            }}
            keyboardType="number-pad"
            editable={!running}
            placeholder="1"
            style={tw.style(
              'w-20 px-3 py-2 rounded-lg border border-border-default text-text-default text-center bg-background-default',
            )}
            placeholderTextColor={tw.color('text-muted')}
            testID="libsodium-poc-iterations-input"
          />
        </Box>

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={running}
          onPress={runJsChecks}
          testID="libsodium-poc-run-js-button"
        >
          Run libsodium-wrappers (JS/WASM)
        </Button>

        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={running}
          onPress={runNativeChecks}
          testID="libsodium-poc-run-native-button"
        >
          Run react-native-libsodium (native)
        </Button>

        {running && !summary ? (
          <Box twClassName="py-4 items-center">
            <ActivityIndicator />
          </Box>
        ) : null}

        {engine ? (
          <Box twClassName="mt-2">
            <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
              {engine}
            </Text>
          </Box>
        ) : null}

        {summary ? (
          <Box
            twClassName={`mt-2 p-3 rounded-lg ${
              summary.includes('failed') ? 'bg-error-muted' : 'bg-success-muted'
            }`}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              testID="libsodium-poc-summary"
            >
              {summary}
            </Text>
          </Box>
        ) : null}

        {results.map((r) => (
          <Box
            key={r.name}
            twClassName="border-b border-border-muted pb-2"
            testID={`libsodium-poc-result-${r.ok ? 'ok' : 'fail'}`}
          >
            <Box twClassName="flex-row justify-between items-start gap-2">
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={r.ok ? TextColor.SuccessDefault : TextColor.ErrorDefault}
                twClassName="flex-1"
              >
                {r.ok ? '✓' : '✗'} {r.name}
              </Text>
              {r.avgMs !== null ? (
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                  testID="libsodium-poc-result-avg"
                >
                  {formatAvg(r.avgMs)}
                </Text>
              ) : null}
            </Box>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {r.detail}
              {r.avgMs !== null && r.iterations > 1
                ? ` · avg over ${r.iterations} runs`
                : ''}
            </Text>
          </Box>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default LibsodiumPoc;
