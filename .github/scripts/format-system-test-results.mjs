#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const reportsPath = process.argv[2] || path.join(process.cwd(), 'all-reports');
const visualPath = process.argv[3] || path.join(process.cwd(), 'all-visual-reports');

const PROJECT_LABELS = {
  'system-android-login': { platform: 'Android', suite: 'Login' },
  'system-android-onboarding': { platform: 'Android', suite: 'Onboarding' },
  'system-ios-login': { platform: 'iOS', suite: 'Login' },
  'system-ios-onboarding': { platform: 'iOS', suite: 'Onboarding' },
};

function processSuite(suite, results) {
  if (suite.specs) {
    for (const spec of suite.specs) {
      const specFile = path.basename(spec.file || '', '.spec.ts');

      for (const test of spec.tests || []) {
        let status;
        if (test.status === 'expected' || test.status === 'flaky') status = 'passed';
        else if (test.status === 'unexpected') status = 'failed';
        else if (test.status === 'skipped') status = 'skipped';
        else status = test.results?.[test.results.length - 1]?.status || 'unknown';

        results.push({
          specFile,
          title: spec.title,
          testName: test.title || spec.title,
          status,
          projectName: test.projectName || '',
        });
      }
    }
  }

  if (suite.suites) {
    for (const child of suite.suites) {
      processSuite(child, results);
    }
  }
}

function parsePlaywrightReport(filePath) {
  const report = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const results = [];

  if (report.suites) {
    for (const suite of report.suites) {
      processSuite(suite, results);
    }
  }

  return results;
}

function findResultFiles(dir) {
  const files = [];
  let entries;

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findResultFiles(full));
    } else if (entry.name === 'results.json') {
      files.push(full);
    }
  }

  return files;
}

function detectVisualFailures(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (detectVisualFailures(full)) return true;
      continue;
    }

    if (entry.name === 'visual-regression-summary.json') {
      try {
        const data = JSON.parse(fs.readFileSync(full, 'utf-8'));
        const checks = Array.isArray(data) ? data : data.results || [];
        if (checks.some((c) => c.passed === false)) return true;
      } catch {
        continue;
      }
    }
  }

  return false;
}

function resolveProjectLabel(dirName) {
  for (const [key, label] of Object.entries(PROJECT_LABELS)) {
    if (dirName.includes(key)) return label;
  }

  if (dirName.includes('android')) {
    return { platform: 'Android', suite: dirName.includes('onboarding') ? 'Onboarding' : 'Login' };
  }
  if (dirName.includes('ios')) {
    return { platform: 'iOS', suite: dirName.includes('onboarding') ? 'Onboarding' : 'Login' };
  }

  return { platform: 'Unknown', suite: dirName };
}

function formatResults() {
  const resultFiles = findResultFiles(reportsPath);
  const allTests = [];

  for (const file of resultFiles) {
    const dirName = path.basename(path.dirname(file));
    const label = resolveProjectLabel(dirName);
    const tests = parsePlaywrightReport(file);

    for (const t of tests) {
      allTests.push({ ...t, platform: label.platform, suite: label.suite });
    }
  }

  const passed = allTests.filter((t) => t.status === 'passed').length;
  const failed = allTests.filter((t) => t.status === 'failed').length;
  const skipped = allTests.filter((t) => t.status === 'skipped').length;
  const failedTests = allTests.filter((t) => t.status === 'failed');
  const hasVisualFailures = detectVisualFailures(visualPath);

  let table = '';
  if (failedTests.length > 0) {
    table += '| Platform | Spec File | Test Name | Status |\n';
    table += '|----------|-----------|-----------|--------|\n';
    for (const t of failedTests) {
      const spec = t.specFile.substring(0, 24).padEnd(24);
      const name = t.testName.substring(0, 40).padEnd(40);
      table += `| ${t.platform.padEnd(8)} | ${spec} | ${name} | ❌ Fail |\n`;
    }
  }

  return {
    passed,
    failed,
    skipped,
    total: allTests.length,
    failedTests: failedTests.map((t) => ({
      platform: t.platform,
      specFile: t.specFile,
      testName: t.testName,
    })),
    table,
    hasVisualFailures,
  };
}

const results = formatResults();
console.log(JSON.stringify(results));
