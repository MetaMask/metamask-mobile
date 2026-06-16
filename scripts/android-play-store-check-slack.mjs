#!/usr/bin/env node
/**
 * Non-blocking Android Play Store checks for prodRelease: Gradle lint + bundletool validate.
 * Always exits 0. Writes android-play-store-check-slack.md in GITHUB_WORKSPACE for Slack (mrkdwn).
 *
 * @see .github/workflows/build.yml
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const root = process.env.GITHUB_WORKSPACE || process.cwd();
const outRel = 'android-play-store-check-slack.md';
const outFile = path.join(root, outRel);
const androidDir = path.join(root, 'android');
const lintXml = path.join(
  root,
  'android/app/build/reports/lint-results-prodRelease.xml',
);
const bundleDir = path.join(
  root,
  'android/app/build/outputs/bundle/prodRelease',
);

/** Slack mrkdwn escaping for user-controlled text in section bodies */
function escapeMrkdwn(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * @param {string} xml
 * @returns {{ id: string, message: string }[]}
 */
function parseLintErrors(xml) {
  const chunks = xml.split('<issue');
  const out = [];
  for (const chunk of chunks) {
    if (!/severity="Error"/.test(chunk)) {
      continue;
    }
    const idM = chunk.match(/\bid="([^"]*)"/);
    const msgM = chunk.match(/message="((?:[^"\\]|\\.)*)"/);
    let message = msgM ? msgM[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : '';
    if (!message) {
      message = chunk.slice(0, 240).trim();
    }
    out.push({ id: idM ? idM[1] : 'unknown', message });
  }
  return out;
}

function runLint() {
  try {
    execFileSync(
      './gradlew',
      [':app:lintProdRelease', '--no-daemon', '--stacktrace'],
      {
        cwd: androidDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    return { ok: true, log: '' };
  } catch (e) {
    const log = `${e.stderr || ''}\n${e.stdout || ''}`.trim();
    return { ok: false, log };
  }
}

function findProdReleaseAab() {
  if (!fs.existsSync(bundleDir)) {
    return [];
  }
  return fs
    .readdirSync(bundleDir)
    .filter((f) => f.endsWith('.aab'))
    .map((f) => path.join(bundleDir, f));
}

function runBundletool(jar, aab) {
  try {
    execFileSync(
      'java',
      ['-jar', jar, 'validate', `--bundle=${aab}`],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    return { ok: true, log: '' };
  } catch (e) {
    const log = `${e.stderr || ''}\n${e.stdout || ''}`.trim();
    return { ok: false, log };
  }
}

function main() {
  const lines = [];
  let anyFail = false;

  const bundletoolJar = path.join(
    process.env.RUNNER_TEMP || '/tmp',
    'bundletool-all.jar',
  );

  if (!fs.existsSync(path.join(androidDir, 'gradlew'))) {
    lines.push('*Gradle* — `android/gradlew` missing.');
    fs.writeFileSync(
      outFile,
      `PLAY_STORE_CHECK_STATUS=fail\n${lines.join('\n')}\n`,
    );
    return;
  }

  lines.push('*Android Play Store check* (`prodRelease`, non-blocking)\n');

  const lintResult = runLint();
  if (lintResult.ok) {
    lines.push('*:app:lintProdRelease* — passed.');
  } else {
    anyFail = true;
    lines.push('*:app:lintProdRelease* — _failed._');
    if (fs.existsSync(lintXml)) {
      const xml = fs.readFileSync(lintXml, 'utf8');
      const issues = parseLintErrors(xml);
      if (issues.length) {
        lines.push('\n*Lint errors:*');
        for (const { id, message } of issues.slice(0, 40)) {
          lines.push(
            `• \`${escapeMrkdwn(id)}\`: ${escapeMrkdwn(message).slice(0, 500)}`,
          );
        }
        if (issues.length > 40) {
          lines.push(`\n_…and ${issues.length - 40} more (see CI lint report)._`);
        }
      } else {
        const tail = lintResult.log.split('\n').slice(-40).join('\n');
        lines.push(
          `\n\`\`\`\n${escapeMrkdwn(tail || '(no lint report XML)')}\n\`\`\`\n`,
        );
      }
    } else {
      const tail = lintResult.log.split('\n').slice(-40).join('\n');
      lines.push(`\n\`\`\`\n${escapeMrkdwn(tail)}\n\`\`\`\n`);
    }
  }

  const aabs = findProdReleaseAab();
  lines.push('');
  if (aabs.length !== 1) {
    anyFail = true;
    lines.push(
      `*bundletool validate* — skipped (_expected exactly one .aab in prodRelease, found ${aabs.length}._)`,
    );
  } else if (!fs.existsSync(bundletoolJar)) {
    anyFail = true;
    lines.push(
      `*bundletool validate* — skipped (_bundletool jar missing at \`${escapeMrkdwn(bundletoolJar)}\`._)`,
    );
  } else {
    const bt = runBundletool(bundletoolJar, aabs[0]);
    if (bt.ok) {
      lines.push(`*bundletool validate* — passed (\`${path.basename(aabs[0])}\`).`);
    } else {
      anyFail = true;
      lines.push(
        `*bundletool validate* — _failed_ (\`${path.basename(aabs[0])}\`).`,
      );
      const tail = bt.log.split('\n').slice(-30).join('\n');
      lines.push(`\n\`\`\`\n${escapeMrkdwn(tail)}\n\`\`\`\n`);
    }
  }

  const status = anyFail ? 'fail' : 'pass';
  const body = lines.join('\n');
  fs.writeFileSync(outFile, `PLAY_STORE_CHECK_STATUS=${status}\n${body}\n`);

  if (anyFail && process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\n## Android Play Store check (non-blocking)\n\n${body}\n\n`,
    );
  }
}

try {
  main();
} catch (err) {
  console.error(err);
  const root = process.env.GITHUB_WORKSPACE || process.cwd();
  const outFile = path.join(root, 'android-play-store-check-slack.md');
  const msg = `PLAY_STORE_CHECK_STATUS=fail\n*Android Play Store check script crashed*\n\`\`\`\n${String(err)}\n\`\`\`\n`;
  try {
    fs.writeFileSync(outFile, msg);
  } catch {
    // ignore
  }
}
