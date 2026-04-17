#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { expandTemplate } = require('./lib.js');

const TEMPLATE_PATH = path.resolve(__dirname, '../references/TASK.interactive.md');
const OVERLAYS = {
  'metamask-extension': path.resolve(__dirname, '../repos/metamask-extension.md'),
  'metamask-mobile': path.resolve(__dirname, '../repos/metamask-mobile.md'),
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    repo: '',
    repoRoot: '',
    sourceKind: '',
    sourceRef: '',
    sourceText: '',
    outputDir: '',
    runId: '',
    ghRepo: '',
    jiraBaseUrl: process.env.JIRA_BASE_URL || '',
    jiraEmail: process.env.JIRA_EMAIL || '',
    jiraToken:
      process.env.CONSENSYS_ATLASSIAN_API_TOKEN ||
      process.env.JIRA_API_TOKEN ||
      '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    switch (argv[i]) {
      case '--repo':
        args.repo = argv[++i] || '';
        break;
      case '--repo-root':
        args.repoRoot = path.resolve(argv[++i] || '');
        break;
      case '--source-kind':
        args.sourceKind = argv[++i] || '';
        break;
      case '--source-ref':
        args.sourceRef = argv[++i] || '';
        break;
      case '--source-text':
        args.sourceText = argv[++i] || '';
        break;
      case '--output-dir':
        args.outputDir = path.resolve(argv[++i] || '');
        break;
      case '--run-id':
        args.runId = argv[++i] || '';
        break;
      case '--gh-repo':
        args.ghRepo = argv[++i] || '';
        break;
      case '--jira-base-url':
        args.jiraBaseUrl = argv[++i] || '';
        break;
      case '--jira-email':
        args.jiraEmail = argv[++i] || '';
        break;
      case '--jira-token':
        args.jiraToken = argv[++i] || '';
        break;
      default:
        break;
    }
  }

  return args;
}

function slugify(value) {
  return (
    String(value || 'run')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'run'
  );
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function writeJson(filePath, value) {
  writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function inferRepoName(repoRoot) {
  const base = path.basename(repoRoot);
  if (base.includes('extension')) return 'metamask-extension';
  if (base.includes('mobile')) return 'metamask-mobile';
  return base;
}

function fetchPrBundle(sourceRef, ghRepo) {
  assert(ghRepo, 'PR source kind requires --gh-repo <owner/name>');
  const view = spawnSync(
    'gh',
    [
      'pr',
      'view',
      sourceRef,
      '--repo',
      ghRepo,
      '--json',
      'title,body,headRefName,changedFiles,labels,author,mergeStateStatus,state,mergedAt,url',
    ],
    { encoding: 'utf8' },
  );
  assert(view.status === 0, `gh pr view failed: ${view.stderr || view.stdout}`);
  const diff = spawnSync('gh', ['pr', 'diff', sourceRef, '--repo', ghRepo], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  assert(diff.status === 0, `gh pr diff failed: ${diff.stderr || diff.stdout}`);
  return [
    `# Source Kind: PR`,
    `# Source Ref: ${sourceRef}`,
    '',
    '## PR Metadata',
    '```json',
    view.stdout.trim(),
    '```',
    '',
    '## PR Diff',
    '```diff',
    diff.stdout.trim(),
    '```',
    '',
  ].join('\n');
}

function fetchJiraBundle(sourceRef, jiraBaseUrl, jiraEmail, jiraToken) {
  assert(
    jiraBaseUrl,
    'Jira source kind requires --jira-base-url or JIRA_BASE_URL',
  );
  assert(
    jiraEmail && jiraToken,
    'Jira source kind requires --jira-email and --jira-token (or env vars)',
  );
  const url = `${jiraBaseUrl.replace(/\/$/, '')}/rest/api/3/issue/${sourceRef}?expand=renderedFields`;
  const res = spawnSync(
    'curl',
    ['-s', '-u', `${jiraEmail}:${jiraToken}`, url],
    {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  assert(res.status === 0, `curl Jira fetch failed: ${res.stderr || res.stdout}`);
  return [
    `# Source Kind: Jira`,
    `# Source Ref: ${sourceRef}`,
    `# Source URL: ${url}`,
    '',
    '## Jira Issue',
    '```json',
    res.stdout.trim(),
    '```',
    '',
  ].join('\n');
}

function fetchTextBundle(sourceRef, sourceText) {
  return [
    `# Source Kind: Text`,
    `# Source Ref: ${sourceRef || 'text'}`,
    '',
    '## Input Text',
    '```text',
    sourceText.trim(),
    '```',
    '',
  ].join('\n');
}

function fetchFileBundle(sourceRef) {
  const filePath = path.resolve(sourceRef);
  assert(fs.existsSync(filePath), `Source file does not exist: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  return [
    `# Source Kind: File`,
    `# Source Ref: ${filePath}`,
    '',
    '## File Contents',
    '```',
    content.trim(),
    '```',
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs();
  assert(args.repoRoot, 'Missing --repo-root <path>');
  const repoName = args.repo || inferRepoName(args.repoRoot);
  assert(OVERLAYS[repoName], `Unsupported --repo / inferred repo: ${repoName}`);
  assert(args.sourceKind, 'Missing --source-kind <pr|jira|text|file>');

  let sourceBundle = '';
  switch (args.sourceKind) {
    case 'pr':
      sourceBundle = fetchPrBundle(args.sourceRef, args.ghRepo);
      break;
    case 'jira':
      sourceBundle = fetchJiraBundle(
        args.sourceRef,
        args.jiraBaseUrl,
        args.jiraEmail,
        args.jiraToken,
      );
      break;
    case 'text':
      sourceBundle = fetchTextBundle(args.sourceRef, args.sourceText);
      break;
    case 'file':
      sourceBundle = fetchFileBundle(args.sourceRef);
      break;
    default:
      throw new Error(`Unsupported --source-kind: ${args.sourceKind}`);
  }

  const runId =
    args.runId ||
    `${slugify(`${args.sourceKind}-${args.sourceRef || 'source'}`)}-${new Date()
      .toISOString()
      .replace(/[:.]/g, '-')}`;
  const runDir =
    args.outputDir ||
    path.resolve(args.repoRoot, 'fs-cook-runs', 'prepared', runId);
  const artifactsDir = path.join(runDir, 'artifacts');
  fs.mkdirSync(artifactsDir, { recursive: true });

  const sourceBundlePath = path.join(runDir, 'SOURCE-BUNDLE.md');
  writeFile(sourceBundlePath, sourceBundle);

  const templateText = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const taskPath = path.join(runDir, 'TASK.md');
  const taskText = expandTemplate(templateText, {
    SCENARIO_ID: runId,
    TARGET_REPO: repoName,
    REPO_ROOT: args.repoRoot,
    SOURCE_KIND: args.sourceKind,
    SOURCE_REF: args.sourceRef || args.sourceKind,
    SOURCE_ARTIFACT_DIR: '',
    TASK_DIR: runDir,
    ARTIFACT_DIR: artifactsDir,
    SOURCE_BUNDLE_FILE: sourceBundlePath,
    VALIDATION_MODE: 'pending',
    TASK_MODE: 'interactive',
  });
  writeFile(taskPath, taskText);

  writeJson(path.join(runDir, 'run-meta.json'), {
    run_id: runId,
    repo: repoName,
    repo_root: args.repoRoot,
    source_kind: args.sourceKind,
    source_ref: args.sourceRef,
    source_bundle_path: sourceBundlePath,
    task_path: taskPath,
    artifacts_dir: artifactsDir,
    gh_repo: args.ghRepo || null,
    jira_base_url: args.jiraBaseUrl || null,
    prepared_at: new Date().toISOString(),
  });

  process.stdout.write(`${runDir}\n`);
}

if (require.main === module) {
  main();
}
