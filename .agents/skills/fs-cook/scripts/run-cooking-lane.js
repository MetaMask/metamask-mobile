#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { expandTemplate } = require('./lib.js');

const DEFAULT_SCENARIO_CONFIG = path.resolve(__dirname, '../assets/scenarios.json');
const TEMPLATE_PATH = path.resolve(__dirname, '../references/TASK.md');
const INTERACTIVE_TEMPLATE_PATH = path.resolve(__dirname, '../references/TASK.interactive.md');
const SKILL_PATH = path.resolve(__dirname, '../SKILL.md');
const VERSION_PATH = path.resolve(__dirname, '../VERSION');
const OVERLAYS = {
  'metamask-extension': path.resolve(__dirname, '../repos/metamask-extension.md'),
  'metamask-mobile': path.resolve(__dirname, '../repos/metamask-mobile.md'),
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseArgs(argv = process.argv.slice(2)) {
  const result = {
    scenarioId: '',
    scenarioConfig: DEFAULT_SCENARIO_CONFIG,
    outputDir: '',
    runId: '',
    runner: 'claude',
    runnerCmd: '',
    runnerMode: 'stream',
    runnerLog: '',
    model: '',
    taskMode: 'standard',
    slotId: '',
    repoRoot: '',
    cdpPort: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    switch (argv[i]) {
      case '--scenario':
        result.scenarioId = argv[++i] || '';
        break;
      case '--scenario-config':
        result.scenarioConfig = path.resolve(argv[++i] || '');
        break;
      case '--output-dir':
        result.outputDir = path.resolve(argv[++i] || '');
        break;
      case '--run-id':
        result.runId = argv[++i] || '';
        break;
      case '--runner':
        result.runner = argv[++i] || '';
        break;
      case '--runner-cmd':
        result.runnerCmd = argv[++i] || '';
        break;
      case '--runner-mode':
        result.runnerMode = argv[++i] || '';
        break;
      case '--runner-log':
        result.runnerLog = path.resolve(argv[++i] || '');
        break;
      case '--model':
        result.model = argv[++i] || '';
        break;
      case '--task-mode':
        result.taskMode = argv[++i] || '';
        break;
      case '--slot':
        result.slotId = argv[++i] || '';
        break;
      case '--repo-root':
        result.repoRoot = path.resolve(argv[++i] || '');
        break;
      case '--cdp-port':
        result.cdpPort = argv[++i] || '';
        break;
      default:
        break;
    }
  }

  return result;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readSkillVersion() {
  if (!fs.existsSync(VERSION_PATH)) return '0.0.0-dev';
  return fs.readFileSync(VERSION_PATH, 'utf8').trim() || '0.0.0-dev';
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function writeJson(filePath, value) {
  writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function slugify(value) {
  return String(value || 'run').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'run';
}

function stripCodeFence(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed.startsWith('```')) return trimmed;
  const lines = trimmed.split('\n');
  lines.shift();
  if (lines[lines.length - 1] && lines[lines.length - 1].trim() === '```') {
    lines.pop();
  }
  return lines.join('\n').trim();
}

function parseJsonEnvelope(rawText) {
  const stripped = stripCodeFence(rawText);
  try {
    return JSON.parse(stripped);
  } catch {
    const firstBrace = stripped.indexOf('{');
    const lastBrace = stripped.lastIndexOf('}');
    assert(firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace, 'Runner output did not contain parseable JSON.');
    return JSON.parse(stripped.slice(firstBrace, lastBrace + 1));
  }
}

function inferProjectRoot(taskArtifactDir) {
  const normalized = path.normalize(taskArtifactDir);
  const marker = `${path.sep}tasks${path.sep}`;
  const index = normalized.indexOf(marker);
  if (index === -1) {
    return path.dirname(normalized);
  }
  return normalized.slice(0, index);
}

function inferRepoName(scenario, projectRoot) {
  if (scenario.repo) return scenario.repo;
  const basename = path.basename(projectRoot);
  if (basename.includes('extension')) return 'metamask-extension';
  if (basename.includes('mobile')) return 'metamask-mobile';
  return basename;
}

function expandHome(value) {
  if (!value) return value;
  if (value === '~') return os.homedir();
  if (value.startsWith('~/')) return path.join(os.homedir(), value.slice(2));
  return value;
}

function getSlotCdpPort(slot) {
  return slot && slot.resources && slot.resources.browser && slot.resources.browser.cdp_port
    ? String(slot.resources.browser.cdp_port)
    : '';
}

function loadPoolSlots(baseDir) {
  const poolDir = path.join(baseDir, 'pool');
  if (!fs.existsSync(poolDir)) return [];
  const slots = [];
  fs.readdirSync(poolDir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .forEach((name) => {
      const fullPath = path.join(poolDir, name);
      const parsed = readJson(fullPath);
      const poolSlots = Array.isArray(parsed.slots) ? parsed.slots : [];
      poolSlots.forEach((slot) => {
        slots.push({
          ...slot,
          pool_file: fullPath,
          machine: parsed.machine || null,
          project: slot.project || parsed.project || null,
          repo: slot.repo ? path.resolve(expandHome(slot.repo)) : '',
          enabled: slot.enabled !== false,
          cdp_port: getSlotCdpPort(slot),
        });
      });
    });
  return slots;
}

function inferProjectName(projectRoot) {
  return path.basename(projectRoot);
}

function findUp(startDir, predicate) {
  let current = path.resolve(startDir);
  while (true) {
    if (predicate(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) return '';
    current = parent;
  }
}

function inferRepoLocalCdpPort(repoRoot) {
  if (process.env.CDP_PORT) return String(process.env.CDP_PORT);
  const toolkitCandidates = [
    path.join(repoRoot, 'temp', '.agent', 'agentic-toolkit.md'),
    path.join(repoRoot, '.agent', 'agentic-toolkit.md'),
  ];
  for (const filePath of toolkitCandidates) {
    if (!fs.existsSync(filePath)) continue;
    const text = fs.readFileSync(filePath, 'utf8');
    const match = text.match(/CDP(?: on| port)?\s+`?(\d+)`?/i);
    if (match) return match[1];
  }
  return '';
}

function resolveRepoLocalContext({ startDir, repoName }) {
  const repoRoot = findUp(startDir, (candidate) => {
    if (!fs.existsSync(path.join(candidate, '.git'))) return false;
    if (repoName === 'metamask-extension') {
      return findFilesByBasename(candidate, ['validate-recipe.js', 'validate-flow-schema.js']).length > 0;
    }
    if (repoName === 'metamask-mobile') {
      return findFilesByBasename(candidate, ['validate-recipe.sh']).length > 0;
    }
    return false;
  });
  if (!repoRoot) return null;
  return {
    repoRoot,
    cdpPort: inferRepoLocalCdpPort(repoRoot),
    resolution: 'repo-local',
  };
}

function probeCdpPort(cdpPort) {
  if (!cdpPort) return false;
  const res = spawnSync('curl', ['-s', '--max-time', '2', `http://127.0.0.1:${cdpPort}/json/version`], {
    encoding: 'utf8',
  });
  return res.status === 0 && /"Browser"\s*:/.test(res.stdout || '');
}

function probeMobileLiveContext(repoRoot) {
  if (!repoRoot) return false;
  const res = spawnSync('yarn', ['a:status'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 5 * 1024 * 1024,
  });
  if (res.status !== 0) return false;
  try {
    const status = JSON.parse(res.stdout || '{}');
    return Boolean(status?.route?.name && status?.deviceName);
  } catch {
    return false;
  }
}

function resolveSlotContext({ baseDir, slotId, projectName, repoName, repoRoot, cdpPort }) {
  const slots = loadPoolSlots(baseDir);
  if (slots.length === 0) {
    return {
      repoRoot,
      cdpPort,
      slotId: slotId || null,
      resolution: 'manual',
    };
  }

  const normalizedRepoRoot = repoRoot ? path.resolve(repoRoot) : '';
  let candidates = slots.filter((slot) => slot.enabled);

  if (slotId) {
    candidates = candidates.filter((slot) => slot.id === slotId);
  } else if (normalizedRepoRoot) {
    candidates = candidates.filter((slot) => slot.repo && path.resolve(slot.repo) === normalizedRepoRoot);
  } else {
    candidates = candidates.filter((slot) => {
      if (projectName && slot.project === projectName) return true;
      if (repoName === 'metamask-extension' && /metamask-extension/.test(slot.repo)) return true;
      if (repoName === 'metamask-mobile' && /metamask-mobile/.test(slot.repo)) return true;
      return false;
    });
  }

  if (candidates.length === 0) {
    return {
      repoRoot,
      cdpPort,
      slotId: slotId || null,
      resolution: 'manual',
    };
  }

  const ranked = candidates
    .map((slot) => ({
      slot,
      live_cdp: probeCdpPort(slot.cdp_port),
    }))
    .sort((left, right) => {
      if (left.live_cdp !== right.live_cdp) return left.live_cdp ? -1 : 1;
      if (Boolean(left.slot.cdp_port) !== Boolean(right.slot.cdp_port)) return left.slot.cdp_port ? -1 : 1;
      return left.slot.id.localeCompare(right.slot.id);
    });

  const selected = ranked[0].slot;
  return {
    repoRoot: normalizedRepoRoot || selected.repo || repoRoot,
    cdpPort: cdpPort || selected.cdp_port || '',
    slotId: selected.id,
    resolution: selected.id === slotId ? 'explicit-slot' : 'auto-slot',
  };
}

function findFilesByBasename(rootDir, basenames) {
  if (!rootDir || !fs.existsSync(rootDir)) return [];
  const wanted = new Set(basenames);
  const results = [];
  const queue = [rootDir];
  while (queue.length > 0) {
    const current = queue.shift();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        return;
      }
      if (wanted.has(entry.name)) {
        results.push(fullPath);
      }
    });
  }
  return results.sort();
}

function collectSourceFiles(artifactDir) {
  const preferred = [
    'review.md',
    'comment.md',
    'comments-report.md',
    'comments-triage.json',
    'recipe-coverage.md',
    'learnings.md',
    'line-comments.json',
    'grade.json',
    'meta.json',
    'probe-state.json',
    'recipe.json',
    'baseline-recipe.json',
    'final-recipe.json',
  ];

  const seen = new Set();
  const files = [];
  preferred.forEach((name) => {
    const fullPath = path.join(artifactDir, name);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      seen.add(fullPath);
      files.push(fullPath);
    }
  });

  fs.readdirSync(artifactDir, { withFileTypes: true }).forEach((entry) => {
    if (!entry.isFile()) return;
    const fullPath = path.join(artifactDir, entry.name);
    if (seen.has(fullPath)) return;
    if (!/\.(md|json|txt)$/i.test(entry.name)) return;
    if (/^(fs-cook-learning|session-metrics)\.json$/i.test(entry.name)) return;
    if (/(summary|trace|workflow)\.json$/i.test(entry.name)) return;
    files.push(fullPath);
  });

  return files;
}

function renderSourceBundle(sourceFiles) {
  const MAX_PER_FILE = 15000;
  const MAX_TOTAL = 50000;
  let total = 0;
  const blocks = [];

  sourceFiles.forEach((filePath) => {
    if (total >= MAX_TOTAL) return;
    const relative = filePath;
    const raw = fs.readFileSync(filePath, 'utf8');
    const truncated = raw.length > MAX_PER_FILE ? `${raw.slice(0, MAX_PER_FILE)}\n...[truncated]` : raw;
    const remaining = MAX_TOTAL - total;
    const value = truncated.length > remaining ? `${truncated.slice(0, remaining)}\n...[truncated]` : truncated;
    total += value.length;
    blocks.push(`## Source: ${relative}\n\n\`\`\`\n${value}\n\`\`\``);
  });

  return blocks.join('\n\n');
}

function renderTaskTemplate(templateText, vars) {
  return expandTemplate(templateText, vars).replace(/\r\n/g, '\n');
}

function resolveTaskTemplatePath(taskMode) {
  if (taskMode === 'interactive') {
    return INTERACTIVE_TEMPLATE_PATH;
  }
  return TEMPLATE_PATH;
}

function buildPrompt({
  scenario,
  repoName,
  taskArtifactDir,
  runDir,
  artifactsDir,
  taskMode,
  taskPath,
  sourceBundlePath,
  skillPath,
  overlayPath,
}) {
  return [
    'You are running the fs-cook cooking skill as an isolated external runner.',
    'Read the run-local task file and follow it top-to-bottom.',
    'This is a batch runner invocation.',
    'Your job is not finished when you draft a recipe in chat.',
    'You must prepare the final task and artifact contents first, then emit exactly one JSON object and nothing else.',
    'Do not wrap the JSON in markdown fences.',
    '',
    '## Scenario',
    `- scenario_id: ${scenario.id}`,
    `- lane: ${scenario.lane}`,
    `- target_repo: ${repoName}`,
    `- source_artifact_dir: ${taskArtifactDir}`,
    `- run_dir: ${runDir}`,
    `- output_artifacts_dir: ${artifactsDir}`,
    `- task_mode: ${taskMode}`,
    `- task_file: ${taskPath}`,
    `- source_bundle_file: ${sourceBundlePath}`,
    `- skill_file: ${skillPath}`,
    `- repo_overlay_file: ${overlayPath}`,
    '',
    '## Required output JSON schema',
    '{',
    '  "task_markdown": "full TASK.md content based on the provided template. Set STATUS to the correct terminal value: done, blocked, or failed. Inside ## Validation Evidence include the exact standalone token FS_COOK_VALIDATION_PENDING.",',
    '  "recipe_json": { "valid": "json object" },',
    '  "recipe_cook_json": { "valid": "json object" } or null,',
    '  "evidence_verdict": "good|ok|bad",',
    '  "next_delta": "one short paragraph describing the next prompt/harness improvement",',
    '  "summary": "one short paragraph summarizing the run"',
    '}',
    '',
    '## Execution contract',
    `Read ${taskPath} first.`,
    `Read ${sourceBundlePath} for the source material.`,
    `Read ${skillPath} for the fs-cook workflow contract.`,
    `Read ${overlayPath} for repo-specific guidance.`,
    taskMode === 'interactive'
      ? '- This run uses interactive task mode. Keep the task artifact developer-facing: surface progress notes, open questions, and material decision checkpoints instead of hiding them.'
      : '- This run uses standard autonomous task mode. Drive the task artifact to a terminal state without waiting for developer feedback on low-risk decisions.',
    '',
    'Before you emit the final JSON object, you must treat the following as already-written target files and prepare their final contents:',
    `- ${path.join(runDir, 'TASK.md')}`,
    `- ${path.join(artifactsDir, 'recipe.json')}`,
    `- ${path.join(artifactsDir, 'recipe-cook.json')} when supported`,
    `- ${path.join(artifactsDir, 'fs-cook-learning.json')}`,
    '',
    'The JSON object you return is the final serialized payload for those files.',
    'Emit the JSON last, after you have fully reasoned through:',
    '- the rewritten TASK.md contents, including the correct terminal STATUS',
    '- the recipe artifact contents',
    '- the learning artifact contents',
    '- what validation commands should run',
    '- which validations are truly unavailable vs merely inconvenient',
    '- every checklist item transition from [ ] to [x]',
    '',
    '## Hard requirements',
    '- Follow the fs-cook workflow order from the task file, skill file, and repo overlay.',
    '- Use the run-local artifact directory paths, not package-root paths, in the task block.',
    '- Do not claim missing proof is resolved; keep unresolved targets explicit.',
    '- Do not edit package files.',
    '- Do not omit the FS_COOK_VALIDATION_PENDING token.',
    '- Do not treat "return one JSON object" as permission to skip the rewritten TASK.md or artifact contents.',
    '- The final JSON object is a transport envelope, not the definition of completion.',
    '- Mark each completed checklist step [x] immediately instead of batching progress updates.',
    '- Use documented runner field names in recipe nodes. For wait_for, prefer timeout_ms and poll_ms instead of guessed aliases like timeout.',
    '- For wait_for, valid condition fields are expression, route, not_route, or test_id. Do not use ref on wait_for nodes; use eval_ref when you need a named state query.',
    '- For wait_for nodes that use expression, always include an assert block (for example {"operator":"truthy"}) or schema validation will fail.',
    '- When validating MetaMask mobile recipes, pass the artifacts directory to validate-recipe.sh, not the task directory.',
    '- Before drafting or running MetaMask mobile perps trade flows, check slot readiness (for example providerCount via app-state.sh eval). If providerCount is 0, treat the live path as blocked immediately instead of spending a trade-flow timeout.',
    '- Before calling a trade setup flow on MetaMask mobile, inspect current slot state. If a relevant position already exists and the flip control is visible, reuse that live state and skip the open-position setup flow instead of forcing trade-open-market.',
    '- More specific rule: on MetaMask mobile, if providerCount is 0 but a relevant position already exists and position-card-flip-icon is visible, prefer a direct flip-path recipe over declaring the slot blocked. The slot is partially usable and should be tested from that state first.',
    '- If SOURCE-BUNDLE.md appears truncated or incomplete, fetch the source directly from the repo or PR diff before drafting the recipe.',
  ].join('\n');
}

function resolveRunnerInvocation({ runner, runnerCmd, model }) {
  if (runnerCmd) {
    return {
      command: runnerCmd,
      args: [],
      shell: true,
    };
  }

  if (runner === 'claude') {
    const args = ['-p'];
    args.push('--dangerously-skip-permissions');
    if (model) {
      args.push('--model', model);
    }
    args.push('--output-format', 'text');
    return {
      command: 'claude',
      args,
      shell: false,
    };
  }

  if (runner === 'codex') {
    const outputLastMessagePath = path.join(
      os.tmpdir(),
      `fs-cook-codex-last-message-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`,
    );
    const args = [
      'exec',
      '-C',
      process.cwd(),
      '-s',
      'danger-full-access',
      '--skip-git-repo-check',
      '-o',
      outputLastMessagePath,
    ];
    if (model) {
      args.push('-m', model);
    }
    args.push('-');
    return {
      command: 'codex',
      args,
      shell: false,
      outputLastMessagePath,
    };
  }

  throw new Error(`Unsupported runner: ${runner}`);
}

function runRunnerBatch({ prompt, runner, runnerCmd, model }) {
  const invocation = resolveRunnerInvocation({ runner, runnerCmd, model });
  let result;
  if (invocation.shell) {
    result = spawnSync(invocation.command, {
      shell: true,
      input: prompt,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
  } else {
    result = spawnSync(invocation.command, invocation.args, {
      input: prompt,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
  }

  if (
    invocation.outputLastMessagePath &&
    fs.existsSync(invocation.outputLastMessagePath)
  ) {
    try {
      result.stdout = fs.readFileSync(invocation.outputLastMessagePath, 'utf8');
    } catch {
      // Fall back to process stdout if the output file can't be read.
    }
  }

  return result;
}

function runRunnerStream({ prompt, runner, runnerCmd, model, runnerLogPath, promptPath }) {
  const invocation = resolveRunnerInvocation({ runner, runnerCmd, model });
  const logPath = runnerLogPath || path.join(os.tmpdir(), `fs-cook-runner-${Date.now()}.log`);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const logStream = fs.createWriteStream(logPath, { encoding: 'utf8' });

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let sawAnyOutput = false;
    let heartbeat = null;
    const commandPreview = invocation.shell
      ? invocation.command
      : [invocation.command].concat(invocation.args || []).join(' ');
    const emitStatus = (message) => {
      const line = `[fs-cook] ${new Date().toISOString()} ${message}\n`;
      logStream.write(line);
      process.stderr.write(line);
    };
    const child = invocation.shell
      ? spawn(invocation.command, {
        shell: true,
        stdio: 'pipe',
      })
      : spawn(invocation.command, invocation.args, {
        stdio: 'pipe',
      });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (heartbeat) clearInterval(heartbeat);
      logStream.end(() => resolve(result));
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      if (heartbeat) clearInterval(heartbeat);
      logStream.end(() => reject(error));
    };

    emitStatus(`runner started in stream mode`);
    emitStatus(`command: ${commandPreview}`);
    if (promptPath) {
      emitStatus(`stdin: ${promptPath}`);
      emitStatus(`debug repro: cat ${JSON.stringify(promptPath)} | ${commandPreview}`);
    }
    emitStatus('waiting for runner output...');
    heartbeat = setInterval(() => {
      if (settled || sawAnyOutput) return;
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      emitStatus(`still waiting for first runner output... ${elapsed}s elapsed`);
    }, 15000);

    child.on('error', (error) => {
      fail(error);
    });

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      if (!sawAnyOutput) {
        sawAnyOutput = true;
        emitStatus('received first runner output chunk');
      }
      stdout += text;
      logStream.write(text);
      process.stderr.write(text);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      if (!sawAnyOutput) {
        sawAnyOutput = true;
        emitStatus('received first runner output chunk');
      }
      stderr += text;
      logStream.write(text);
      process.stderr.write(text);
    });

    child.on('close', (code, signal) => {
      finish({
        status: typeof code === 'number' ? code : -1,
        signal: signal || null,
        stdout,
        stderr,
        logPath,
      });
    });

    child.stdin.on('error', () => {});
    child.stdin.end(prompt);
  });
}

async function runRunner({ prompt, runner, runnerCmd, runnerMode, model, runnerLogPath, promptPath }) {
  if (!runnerMode || runnerMode === 'batch') {
    const result = runRunnerBatch({
      prompt,
      runner,
      runnerCmd,
      model,
    });
    return {
      status: result.status,
      signal: result.signal || null,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      logPath: runnerLogPath || null,
    };
  }

  if (runnerMode === 'stream') {
    return runRunnerStream({
      prompt,
      runner,
      runnerCmd,
      model,
      runnerLogPath,
      promptPath,
    });
  }

  throw new Error(`Unsupported runner mode: ${runnerMode}`);
}

function discoverValidationSteps({ repoName, repoRoot, recipePath, artifactsDir, cdpPort }) {
  if (!repoRoot || !fs.existsSync(repoRoot)) {
    return [];
  }

  if (repoName === 'metamask-extension') {
    const schemaValidator = findFilesByBasename(repoRoot, ['validate-flow-schema.js'])[0];
    const recipeValidator = findFilesByBasename(repoRoot, ['validate-recipe.js'])[0];
    if (!schemaValidator || !recipeValidator) {
      return [];
    }
    const steps = [
      {
        name: 'schema_validation',
        command: ['node', schemaValidator, recipePath],
        cwd: repoRoot,
      },
      {
        name: 'dry_run',
        command: ['node', recipeValidator, '--recipe', recipePath, '--dry-run'],
        cwd: repoRoot,
      },
    ];
    if (cdpPort) {
      steps.push({
        name: 'live_run',
        command: ['node', recipeValidator, '--recipe', recipePath, '--cdp-port', String(cdpPort), '--skip-manual', '--artifacts-dir', artifactsDir],
        cwd: repoRoot,
      });
    }
    return steps;
  }

  if (repoName === 'metamask-mobile') {
    const shellValidator = findFilesByBasename(repoRoot, ['validate-recipe.sh'])[0];
    if (!shellValidator) {
      return [];
    }
    const steps = [
      {
        name: 'dry_run',
        command: ['bash', shellValidator, artifactsDir, '--dry-run'],
        cwd: repoRoot,
      },
    ];
    if (cdpPort) {
      steps.push({
        name: 'live_run',
        command: ['bash', shellValidator, artifactsDir, '--skip-manual'],
        cwd: repoRoot,
      });
    }
    return steps;
  }

  return [];
}

function runValidationSteps(steps, validationDir) {
  const results = {};
  steps.forEach((step) => {
    const commandString = step.command.map((part) => (/\s/.test(part) ? JSON.stringify(part) : part)).join(' ');
    const res = spawnSync(step.command[0], step.command.slice(1), {
      cwd: step.cwd,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
    const logPath = path.join(validationDir, `${step.name}.log`);
    writeFile(logPath, [
      `$ ${commandString}`,
      '',
      res.stdout || '',
      res.stderr || '',
    ].join('\n'));
    results[step.name] = {
      command: commandString,
      exit_code: typeof res.status === 'number' ? res.status : -1,
      log_path: logPath,
    };
  });
  return results;
}

function renderValidationEvidence(validationResults, cdpPort, repoRoot) {
  const lines = [];
  const stepOrder = ['schema_validation', 'dry_run', 'live_run'];
  stepOrder.forEach((name) => {
    const result = validationResults[name];
    if (!result) return;
    lines.push(`- ${name}: \`${result.command}\``);
    lines.push(`  - exit: ${result.exit_code}`);
    lines.push(`  - log: ${result.log_path}`);
  });

  if (!validationResults.schema_validation && !validationResults.dry_run && !validationResults.live_run) {
    lines.push(`- validation unavailable: no repo-local validator/runner discovered under ${repoRoot || 'unspecified repo root'}`);
  } else if (!validationResults.live_run) {
    if (!cdpPort) {
      lines.push('- live validation unavailable: missing `--cdp-port` for a live runner invocation');
    } else {
      lines.push('- live validation unavailable: no live runner was discovered');
    }
  }

  return lines.join('\n');
}

function deriveTerminalState(taskMarkdown, validationResults) {
  const text = String(taskMarkdown || '');
  if (/\bSTATUS:\s*blocked\b/i.test(text)) {
    return { status: 'blocked', outcome: 'partial' };
  }
  if (/\bSTATUS:\s*failed\b/i.test(text)) {
    return { status: 'failed', outcome: 'failure' };
  }
  if (/\bUNRESOLVED\b/i.test(text)) {
    return { status: 'blocked', outcome: 'partial' };
  }

  const failingStep = Object.values(validationResults || {}).find((result) => result.exit_code !== 0 && result.exit_code !== -1);
  if (failingStep) {
    return { status: 'failed', outcome: 'failure' };
  }

  return { status: 'done', outcome: 'success' };
}

function injectValidationEvidence(taskMarkdown, evidenceBlock) {
  let next = String(taskMarkdown || '');
  if (/## Validation Evidence[\s\S]*?(?=\n## |\s*$)/.test(next)) {
    next = next.replace(/## Validation Evidence[\s\S]*?(?=\n## |\s*$)/, `## Validation Evidence\n\n${evidenceBlock}\n`);
  } else if (next.includes('FS_COOK_VALIDATION_PENDING')) {
    next = next.replace('FS_COOK_VALIDATION_PENDING', evidenceBlock);
  } else {
    next = `${next.trim()}\n\n## Validation Evidence\n\n${evidenceBlock}\n`;
  }
  next = next.replace(/FS_COOK_VALIDATION_PENDING/g, '').replace(/\n{3,}/g, '\n\n');
  return next.endsWith('\n') ? next : `${next}\n`;
}

function normalizeTaskArtifactDir(taskMarkdown, artifactsDir) {
  if (!/ARTIFACT_DIR:/.test(taskMarkdown)) {
    return taskMarkdown;
  }
  return taskMarkdown.replace(/ARTIFACT_DIR:\s*.*/, `ARTIFACT_DIR: ${artifactsDir}`);
}

function mapVerdict(value, validationResults) {
  const candidate = ['good', 'ok', 'bad'].includes(value) ? value : 'ok';
  const failingStep = Object.values(validationResults).find((result) => result.exit_code !== 0 && result.exit_code !== -1);
  if (failingStep) return 'bad';
  return candidate;
}

function nowIso() {
  return new Date().toISOString();
}

async function main() {
  const args = parseArgs();
  assert(args.scenarioId, 'Missing required --scenario <id>');
  assert(['batch', 'stream'].includes(args.runnerMode), `Unsupported --runner-mode: ${args.runnerMode}`);
  assert(['standard', 'interactive'].includes(args.taskMode), `Unsupported --task-mode: ${args.taskMode}`);

  const scenarioConfig = readJson(args.scenarioConfig);
  assert(Array.isArray(scenarioConfig.scenarios), `Invalid scenario config: ${args.scenarioConfig}`);
  const scenario = scenarioConfig.scenarios.find((entry) => entry.id === args.scenarioId);
  assert(scenario, `Scenario not found: ${args.scenarioId}`);

  const taskArtifactDir = path.resolve(process.cwd(), scenario.task_artifact_dir);
  assert(fs.existsSync(taskArtifactDir), `Scenario artifact dir does not exist: ${taskArtifactDir}`);

  const inferredProjectRoot = path.resolve(process.cwd(), inferProjectRoot(scenario.task_artifact_dir));
  const projectName = inferProjectName(inferredProjectRoot);
  const repoName = inferRepoName(scenario, inferredProjectRoot);
  const repoLocalContext = (!args.repoRoot && !args.slotId)
    ? resolveRepoLocalContext({ startDir: process.cwd(), repoName })
    : null;
  const slotContext = resolveSlotContext({
    baseDir: process.cwd(),
    slotId: args.slotId,
    projectName,
    repoName,
    repoRoot: args.repoRoot || (repoLocalContext ? repoLocalContext.repoRoot : ''),
    cdpPort: args.cdpPort || (repoLocalContext ? repoLocalContext.cdpPort : ''),
  });
  const projectRoot = slotContext.repoRoot || (repoLocalContext ? repoLocalContext.repoRoot : '') || args.repoRoot || inferredProjectRoot;
  const effectiveCdpPort = slotContext.cdpPort || (repoLocalContext ? repoLocalContext.cdpPort : '') || args.cdpPort;
  const mobileLiveAvailable = repoName === 'metamask-mobile' && probeMobileLiveContext(projectRoot);
  const effectiveLiveHint = effectiveCdpPort || (mobileLiveAvailable ? 'auto-mobile-live' : '');
  const overlayPath = OVERLAYS[repoName];
  assert(overlayPath && fs.existsSync(overlayPath), `Missing fs-cook overlay for repo: ${repoName}`);

  const runId = args.runId || `${slugify(scenario.id)}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const runDir = args.outputDir || path.resolve(process.cwd(), 'fs-cook-runs', scenario.id, runId);
  const artifactsDir = path.join(runDir, 'artifacts');
  const validationDir = path.join(artifactsDir, 'validation');
  const runnerLogPath = args.runnerLog || (args.runnerMode === 'stream' ? path.join(runDir, 'runner.log') : '');
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.mkdirSync(validationDir, { recursive: true });

  const skillText = fs.readFileSync(SKILL_PATH, 'utf8');
  const skillVersion = readSkillVersion();
  const templatePath = resolveTaskTemplatePath(args.taskMode);
  const templateText = fs.readFileSync(templatePath, 'utf8');
  const sourceFiles = collectSourceFiles(taskArtifactDir);
  const sourceBundle = renderSourceBundle(sourceFiles);
  const sourceBundlePath = path.join(runDir, 'SOURCE-BUNDLE.md');
  writeFile(sourceBundlePath, sourceBundle || 'No source files found.\n');

  const taskPath = path.join(runDir, 'TASK.md');
  const taskTemplateVars = {
    SCENARIO_ID: scenario.id,
    TARGET_REPO: repoName,
    REPO_ROOT: projectRoot,
    SOURCE_KIND: scenario.lane,
    SOURCE_REF: scenario.id,
    SOURCE_ARTIFACT_DIR: taskArtifactDir,
    TASK_DIR: runDir,
    ARTIFACT_DIR: artifactsDir,
    SOURCE_BUNDLE_FILE: sourceBundlePath,
    VALIDATION_MODE: effectiveLiveHint ? 'live' : 'batch-isolated',
    TASK_MODE: args.taskMode,
  };
  const taskTemplate = renderTaskTemplate(templateText, taskTemplateVars);
  writeFile(taskPath, taskTemplate);

  const prompt = buildPrompt({
    scenario,
    repoName,
    taskArtifactDir,
    runDir,
    artifactsDir,
    taskMode: args.taskMode,
    taskPath,
    sourceBundlePath,
    skillPath: SKILL_PATH,
    overlayPath,
  });

  const promptPath = path.join(runDir, 'prompt.txt');
  writeFile(promptPath, prompt);
  writeJson(path.join(runDir, 'run-meta.json'), {
    scenario_id: scenario.id,
    lane: scenario.lane,
    repo: repoName,
    project_name: projectName,
    project_root: projectRoot,
    slot_id: slotContext.slotId,
    slot_resolution: repoLocalContext ? repoLocalContext.resolution : slotContext.resolution,
    cdp_port: effectiveLiveHint || null,
    source_artifact_dir: taskArtifactDir,
    run_dir: runDir,
    artifacts_dir: artifactsDir,
    task_mode: args.taskMode,
    prompt_path: promptPath,
    runner: args.runner,
    runner_cmd: args.runnerCmd || null,
    runner_mode: args.runnerMode,
    runner_log: runnerLogPath || null,
    model: args.model || null,
    skill_version: skillVersion,
    started_at: nowIso(),
  });

  const runnerResult = await runRunner({
    prompt,
    runner: args.runner,
    runnerCmd: args.runnerCmd,
    runnerMode: args.runnerMode,
    model: args.model,
    runnerLogPath,
    promptPath,
  });
  const rawOutput = [runnerResult.stdout || '', runnerResult.stderr || ''].join('\n').trim();
  writeFile(path.join(runDir, 'runner-output.txt'), `${rawOutput}\n`);
  assert(runnerResult.status === 0, `Runner exited with status ${runnerResult.status}. See ${path.join(runDir, 'runner-output.txt')}`);

  const envelope = parseJsonEnvelope(rawOutput);
  assert(typeof envelope.task_markdown === 'string' && envelope.task_markdown.trim(), 'Runner output missing task_markdown');
  assert(envelope.recipe_json && typeof envelope.recipe_json === 'object' && !Array.isArray(envelope.recipe_json), 'Runner output missing recipe_json object');
  assert(envelope.recipe_cook_json == null || (typeof envelope.recipe_cook_json === 'object' && !Array.isArray(envelope.recipe_cook_json)), 'recipe_cook_json must be an object or null');
  assert(typeof envelope.next_delta === 'string' && envelope.next_delta.trim(), 'Runner output missing next_delta');
  writeJson(path.join(runDir, 'runner-response.json'), envelope);

  const recipePath = path.join(artifactsDir, 'recipe.json');
  const recipeCookPath = envelope.recipe_cook_json ? path.join(artifactsDir, 'recipe-cook.json') : null;
  writeJson(recipePath, envelope.recipe_json);
  if (recipeCookPath) {
    writeJson(recipeCookPath, envelope.recipe_cook_json);
  }

  const validationSteps = discoverValidationSteps({
    repoName,
    repoRoot: projectRoot,
    recipePath,
    artifactsDir,
    cdpPort: effectiveLiveHint,
  });
  const validationResults = runValidationSteps(validationSteps, validationDir);
  const evidenceBlock = renderValidationEvidence(validationResults, effectiveCdpPort, projectRoot);
  const normalizedTask = normalizeTaskArtifactDir(envelope.task_markdown, artifactsDir);
  let finalTask = injectValidationEvidence(normalizedTask, evidenceBlock);
  const terminalState = deriveTerminalState(finalTask, validationResults);
  finalTask = finalTask.replace(/STATUS:\s*(pending|working|done|blocked|failed)/i, `STATUS: ${terminalState.status}`);
  writeFile(path.join(runDir, 'TASK.md'), finalTask);

  const verdict = mapVerdict(envelope.evidence_verdict, validationResults);
  const completedAt = nowIso();
  writeJson(path.join(artifactsDir, 'meta.json'), {
    runner: args.runner,
    model: args.model || 'unknown',
    tier: 'external',
    recommendation: 'COMMENT',
    started_at: readJson(path.join(runDir, 'run-meta.json')).started_at,
    completed_at: completedAt,
    validate_exit: validationResults.live_run ? validationResults.live_run.exit_code : (validationResults.dry_run ? validationResults.dry_run.exit_code : -1),
    outcome: terminalState.outcome === 'failure' ? 'failed' : (terminalState.outcome === 'partial' ? 'blocked' : 'completed'),
  });
  writeJson(path.join(artifactsDir, 'grade.json'), {
    recipe_semantic: verdict,
    reasoning: envelope.summary || envelope.next_delta,
    graded_by: args.runner === 'claude' ? 'claude-external-runner' : 'external-runner',
    graded_at: completedAt,
  });
  writeJson(path.join(artifactsDir, 'fs-cook-learning.json'), {
    run_id: runId,
    scenario_type: scenario.lane,
    target_repo: repoName,
    branch: null,
    artifact_dir: artifactsDir,
    recipe_path: recipePath,
    recipe_cook_path: recipeCookPath,
    validation_results: validationResults,
    evidence_verdict: verdict,
    next_delta: envelope.next_delta,
    touched_files: [],
    source_scenario_id: scenario.id,
    source_artifact_dir: taskArtifactDir,
    slot_id: slotContext.slotId || null,
    runner: args.runner,
    model: args.model || null,
  });

  const runMeta = readJson(path.join(runDir, 'run-meta.json'));
  runMeta.completed_at = completedAt;
  writeJson(path.join(runDir, 'run-meta.json'), runMeta);

  process.stdout.write(`${runDir}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error && error.stack ? error.stack : String(error)}\n`);
    process.exit(1);
  });
}

module.exports = {
  buildPrompt,
  collectSourceFiles,
  discoverValidationSteps,
  injectValidationEvidence,
  normalizeTaskArtifactDir,
  parseJsonEnvelope,
  renderSourceBundle,
  runRunner,
  stripCodeFence,
};
