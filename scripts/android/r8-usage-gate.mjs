#!/usr/bin/env node
/**
 * R8 usage-regression gate.
 *
 * R8 cannot see reflective, JNI or JS-driven access, so when a keep rule is removed or a
 * dependency bump renames a class, R8 silently strips code that is still reached at runtime. The
 * failure surfaces as ClassNotFoundException / NoSuchMethodError in production, not at build time.
 *
 * `usage.txt` (emitted by `-printusage`, see android/app/proguard-rules.pro) lists everything R8
 * removed. Diffing it against a known-good baseline turns that silent class of bug into a
 * deterministic build failure.
 *
 * Usage:
 *   node scripts/android/r8-usage-gate.mjs --baseline <usage.txt> --current <usage.txt>
 *   node scripts/android/r8-usage-gate.mjs --baseline base.txt --current cur.txt --json report.json
 *
 * Options:
 *   --baseline <path>  usage.txt from the last known-good build (e.g. main)
 *   --current  <path>  usage.txt from this build
 *   --json     <path>  optional machine-readable report
 *   --allow    <list>  comma-separated extra namespaces to treat as protected
 *   --ignore   <list>  comma-separated prefixes to exclude from the gate
 *
 * Exit codes: 0 clean · 1 protected regression · 2 bad invocation
 */

import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Compiler- and R8-generated class names.
 *
 * With the optimizer enabled, R8 legitimately deletes large numbers of these: Kotlin `Companion`
 * objects get inlined into their host, `when` tables (`$WhenMappings`) fold into constants, enums
 * are unboxed, `R$*` classes become literal ints, `*Kt` file facades and desugaring shims are
 * merged away. None of that is reachable by reflection under these names, so flagging them
 * produces pure noise — in a real run against this repo they were 324 of 490 hits.
 */
const SYNTHETIC_PATTERNS = [
  /\$\$InternalSynthetic/, //          R8 desugaring/backport shims
  /\$\$ExternalSyntheticLambda/, //    desugared lambdas
  /EnumUnboxingLocalUtility$/, //      enum unboxing
  /-IA$/, //                           R8 synthetic accessor holder
  /\$WhenMappings$/, //                Kotlin `when` over enum
  /\$Companion$/, //                   inlined Kotlin companion
  /\.R\$\w+$/, //                      resource ID holders, inlined to constants
  /\$\d+$/, //                         anonymous inner classes
];

function isSynthetic(className) {
  return SYNTHETIC_PATTERNS.some((pattern) => pattern.test(className));
}

/**
 * Namespaces where a newly-removed class is very likely a real runtime break.
 *
 * These are the reflective / JNI / codegen surfaces of a New-Architecture React Native wallet.
 * Add to this list when a new reflection-driven dependency is introduced — the cost of a false
 * positive (one investigation) is far below the cost of a false negative (a shipped crash).
 */
const PROTECTED_NAMESPACES = [
  // React Native core: bridge, TurboModules, Fabric, codegen output
  'com.facebook.react',
  'com.facebook.fbreact.specs',
  'com.facebook.hermes',
  'com.facebook.jni',
  'com.facebook.soloader',
  'com.facebook.proguard.annotations',
  // Crypto / keychain / vault — silent breakage here bricks wallets
  'com.facebook.crypto',
  'com.oblador.keychain',
  // Reflection-driven third parties
  'io.branch',
  'org.greenrobot.eventbus',
  'org.webrtc',
  'com.horcrux.svg',
  'io.sentry',
  'kotlinx.serialization',
  'kotlin.coroutines',
  // Our own native modules
  'io.metamask',
];

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i];
    if (!key.startsWith('--')) return null;
    args[key.slice(2)] = argv[i + 1];
  }
  return args;
}

/**
 * Parse an R8 `-printusage` file.
 *
 * Format: a class removed outright appears as a bare line at column 0. A class that survived but
 * lost members appears as `com.example.Foo:` followed by indented member lines. Only whole-class
 * removals are gated — member-level stripping inside a surviving class is normal optimizer work
 * and would produce constant false positives.
 */
function parseUsage(text) {
  const removedClasses = new Set();
  const partialClasses = new Set();

  for (const rawLine of text.split('\n')) {
    if (!rawLine || /^\s/.test(rawLine)) continue; // member line or blank
    const line = rawLine.trimEnd();
    if (!line) continue;
    if (line.endsWith(':')) {
      partialClasses.add(line.slice(0, -1));
    } else {
      removedClasses.add(line);
    }
  }
  return { removedClasses, partialClasses };
}

function isProtected(className, protectedList, ignoreList) {
  if (ignoreList.some((prefix) => className.startsWith(prefix))) return false;
  if (isSynthetic(className)) return false;
  return protectedList.some(
    (ns) => className === ns || className.startsWith(`${ns}.`),
  );
}

/**
 * Both usage files must come from builds with the SAME optimizer configuration.
 *
 * Diffing an optimizer-off build against an optimizer-on one is meaningless here: enabling the
 * optimizer removes thousands of classes by design, so every run would "fail". The gate answers a
 * narrower question — "given the same R8 settings, did this change cause R8 to strip something it
 * previously kept?" — which is why CI runs it against the merge base rather than a fixed baseline.
 *
 * Heuristic: a swing this large is only explicable by an optimizer-config change.
 */
function warnIfConfigMismatch(baseline, current) {
  const delta = Math.abs(current.removedClasses.size - baseline.removedClasses.size);
  const base = Math.max(baseline.removedClasses.size, 1);
  if (delta / base > 0.15) {
    console.warn(
      `\n⚠️  The two builds differ by ${((delta / base) * 100).toFixed(1)}% in classes removed.\n` +
        '   That usually means they were built with different R8 settings (e.g. proguard-android.txt\n' +
        '   vs proguard-android-optimize.txt), in which case this diff is not a valid gate — the\n' +
        '   optimizer removes classes by design. Compare like-for-like builds instead.\n',
    );
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (!args || !args.baseline || !args.current) {
    console.error(
      'Usage: node scripts/android/r8-usage-gate.mjs --baseline <usage.txt> --current <usage.txt> [--json <out>] [--allow ns,ns] [--ignore prefix,prefix]',
    );
    process.exit(2);
  }

  const protectedList = [
    ...PROTECTED_NAMESPACES,
    ...(args.allow ? args.allow.split(',').map((s) => s.trim()).filter(Boolean) : []),
  ];
  const ignoreList = args.ignore
    ? args.ignore.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  let baseline;
  let current;
  try {
    baseline = parseUsage(readFileSync(args.baseline, 'utf8'));
    current = parseUsage(readFileSync(args.current, 'utf8'));
  } catch (error) {
    console.error(`Failed to read usage files: ${error.message}`);
    process.exit(2);
  }

  const newlyRemoved = [...current.removedClasses]
    .filter((cls) => !baseline.removedClasses.has(cls))
    .sort();
  const noLongerRemoved = [...baseline.removedClasses]
    .filter((cls) => !current.removedClasses.has(cls))
    .sort();

  warnIfConfigMismatch(baseline, current);

  const violations = newlyRemoved.filter((cls) =>
    isProtected(cls, protectedList, ignoreList),
  );
  const suppressedSynthetic = newlyRemoved.filter(
    (cls) =>
      isSynthetic(cls) &&
      protectedList.some((ns) => cls.startsWith(`${ns}.`)) &&
      !ignoreList.some((prefix) => cls.startsWith(prefix)),
  ).length;

  const report = {
    baselineRemovedCount: baseline.removedClasses.size,
    currentRemovedCount: current.removedClasses.size,
    netChange: current.removedClasses.size - baseline.removedClasses.size,
    newlyRemovedCount: newlyRemoved.length,
    noLongerRemovedCount: noLongerRemoved.length,
    suppressedSynthetic,
    violations,
  };

  if (args.json) writeFileSync(args.json, JSON.stringify(report, null, 2));

  console.log('R8 usage diff');
  console.log(`  classes removed (baseline): ${report.baselineRemovedCount}`);
  console.log(`  classes removed (current):  ${report.currentRemovedCount}`);
  console.log(
    `  net change:                 ${report.netChange > 0 ? '+' : ''}${report.netChange} ` +
      `(positive = R8 stripped more, usually good)`,
  );
  console.log(`  newly removed:              ${report.newlyRemovedCount}`);
  console.log(`  no longer removed:          ${report.noLongerRemovedCount}`);
  console.log(
    `  synthetics ignored:         ${report.suppressedSynthetic} ` +
      `(companions, R$*, when-tables, desugaring shims)`,
  );

  if (!violations.length) {
    console.log('\n✅ No protected-namespace classes were newly removed.');
    process.exit(0);
  }

  console.error(
    `\n❌ ${violations.length} protected class(es) newly removed by R8.\n` +
      'Each of these is reachable only reflectively / over JNI / from JS, so R8 cannot prove it is\n' +
      'used. Either add a targeted keep rule, or confirm the code really is dead and add the\n' +
      'namespace to --ignore with a comment explaining why.\n',
  );
  for (const cls of violations) console.error(`  - ${cls}`);
  console.error(
    '\nInvestigate a specific entry with:\n' +
      '  ./gradlew :app:assembleProdRelease -Pandroid.r8.printWhyAreYouKeeping=<class>\n' +
      'or add `-whyareyoukeeping class <class>` to android/app/proguard-rules.pro.',
  );
  process.exit(1);
}

main();
