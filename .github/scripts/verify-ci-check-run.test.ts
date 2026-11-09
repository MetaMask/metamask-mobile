import { spawnSync } from 'child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const scriptPath = join(__dirname, 'verify-ci-check-run.sh');

const stubSource = `#!/usr/bin/env bash
set -euo pipefail
prev=""
for arg in "$@"; do
  if [[ "\$arg" == "-f" || "\$arg" == "-F" || "\$arg" == "-X" || "\$arg" == "--method" || "\$prev" == "-f" || "\$prev" == "-F" ]]; then
    echo "refusing non-GET" >&2
    exit 1
  fi
  prev="\$arg"
done
url="\${@: -1}"
mode="\${GH_STUB_MODE:?}"
if [[ "\$mode" == "error" ]]; then
  echo "stub api error" >&2
  exit 1
fi
if [[ "\$url" == *"/labels?"* ]]; then
  if [[ "\$mode" == "label-skip" || "\$mode" == "label-removed" ]]; then
    echo '[{"name":"skip-ci-gate"}]'
  else
    echo '[]'
  fi
  exit 0
fi
if [[ "\$url" == *"/events?"* ]]; then
  if [[ "\$mode" == "label-skip" ]]; then
    echo '[{"event":"labeled","label":{"name":"skip-ci-gate"},"actor":{"login":"alice"}},{"event":"unlabeled","label":{"name":"skip-ci-gate"},"actor":{"login":"bob"}},{"event":"labeled","label":{"name":"skip-ci-gate"},"actor":{"login":"cara"}}]'
  elif [[ "\$mode" == "label-removed" ]]; then
    echo '[{"event":"labeled","label":{"name":"skip-ci-gate"},"actor":{"login":"alice"}},{"event":"unlabeled","label":{"name":"skip-ci-gate"},"actor":{"login":"bob"}}]'
  else
    echo '[]'
  fi
  exit 0
fi
if [[ "\$url" != *"/actions/workflows/ci.yml/runs?"* && "\$url" != *"/jobs?"* ]]; then
  echo '[{"name":"Check all jobs pass","status":"completed","conclusion":"success","app":{"slug":"github-actions"},"started_at":"2026-11-09T10:05:00Z"}]'
  exit 0
fi
push_only=false
if [[ "\$url" == *event=push* ]]; then
  push_only=true
fi
case "\$mode" in
  push-red-pr-green)
    if [[ "\$url" == *"/jobs?"* ]]; then
      if [[ "\$url" == *"/runs/99/"* ]]; then
        echo '{"jobs":[{"name":"Check all jobs pass","status":"completed","conclusion":"success"}]}'
      else
        echo '{"jobs":[{"name":"Check all jobs pass","status":"completed","conclusion":"failure"}]}'
      fi
      exit 0
    fi
    if [[ "\$push_only" == true ]]; then
      echo '{"total_count":1,"workflow_runs":[{"id":11,"run_number":4,"run_attempt":1,"event":"push","status":"completed","conclusion":"failure"}]}'
    else
      echo '{"total_count":2,"workflow_runs":[{"id":11,"run_number":4,"run_attempt":1,"event":"push","status":"completed","conclusion":"failure"},{"id":99,"run_number":9,"run_attempt":1,"event":"pull_request","status":"completed","conclusion":"success"}]}'
    fi
    ;;
  push-green-pr-running)
    if [[ "\$url" == *"/jobs?"* ]]; then
      if [[ "\$url" == *"/runs/98/"* ]]; then
        echo '{"jobs":[{"name":"Check all jobs pass","status":"in_progress","conclusion":null}]}'
      else
        echo '{"jobs":[{"name":"Check all jobs pass","status":"completed","conclusion":"success"}]}'
      fi
      exit 0
    fi
    if [[ "\$push_only" == true ]]; then
      echo '{"total_count":1,"workflow_runs":[{"id":21,"run_number":3,"run_attempt":1,"event":"push","status":"completed","conclusion":"success"}]}'
    else
      echo '{"total_count":2,"workflow_runs":[{"id":21,"run_number":3,"run_attempt":1,"event":"push","status":"completed","conclusion":"success"},{"id":98,"run_number":10,"run_attempt":1,"event":"pull_request","status":"in_progress","conclusion":null}]}'
    fi
    ;;
  no-push)
    echo '{"total_count":0,"workflow_runs":[]}'
    ;;
  push-running)
    echo '{"total_count":1,"workflow_runs":[{"id":31,"run_number":2,"run_attempt":1,"event":"push","status":"in_progress","conclusion":null}]}'
    ;;
  attempt-tie)
    if [[ "\$url" == *"/jobs?"* ]]; then
      if [[ "\$url" == *"/runs/41/"* ]]; then
        echo '{"jobs":[{"name":"Check all jobs pass","status":"completed","conclusion":"failure"}]}'
      else
        echo '{"jobs":[{"name":"Check all jobs pass","status":"completed","conclusion":"success"}]}'
      fi
      exit 0
    fi
    echo '{"total_count":2,"workflow_runs":[{"id":41,"run_number":9,"run_attempt":2,"event":"push","status":"completed","conclusion":"failure"},{"id":40,"run_number":9,"run_attempt":1,"event":"push","status":"completed","conclusion":"success"}]}'
    ;;
  label-skip|label-removed)
    echo '{"total_count":1,"workflow_runs":[{"id":51,"run_number":1,"run_attempt":1,"event":"push","status":"completed","conclusion":"failure"}]}'
    ;;
  *)
    echo "unknown stub mode" >&2
    exit 1
    ;;
esac
`;

const runGate = (
  mode: string,
): { status: number | null; stdout: string; stderr: string; summary: string } => {
  const directory = mkdtempSync(join(tmpdir(), 'ci-gate-'));
  const stubPath = join(directory, 'gh');
  const summaryPath = join(directory, 'summary.md');
  writeFileSync(stubPath, stubSource);
  chmodSync(stubPath, 0o755);
  writeFileSync(summaryPath, '');

  const result = spawnSync(scriptPath, [], {
    encoding: 'utf8',
    env: {
      PATH: `${directory}:${process.env.PATH ?? ''}`,
      GH_STUB_MODE: mode,
      GITHUB_REPOSITORY: 'MetaMask/metamask-mobile',
      RELEASE_SHA: 'abc123',
      PR_NUMBER: '42',
      GITHUB_STEP_SUMMARY: summaryPath,
    },
  });

  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    summary: readFileSync(summaryPath, 'utf8'),
  };
};

describe('verify-ci-check-run.sh', (): void => {
  it('blocks a red push run when a later pull_request run is green', (): void => {
    const result = runGate('push-red-pr-green');

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('did not succeed');
  });

  it('passes a green push run while a pull_request run is still in progress', (): void => {
    const result = runGate('push-green-pr-running');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('succeeded');
  });

  it('blocks when no push run exists', (): void => {
    const result = runGate('no-push');

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('has not run on push');
  });

  it('blocks while the push run is in progress', (): void => {
    const result = runGate('push-running');

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('still running');
  });

  it('uses the newest run_attempt when started_at ties', (): void => {
    const result = runGate('attempt-tie');

    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('did not succeed');
  });

  it('blocks when the GitHub API errors', (): void => {
    const result = runGate('error');

    expect(result.status).not.toBe(0);
  });

  it('skips only when the label is still applied and the adder is known', (): void => {
    const result = runGate('label-skip');

    expect(result.status).toBe(0);
    expect(result.summary).toContain('added by cara');
    expect(result.summary).toContain('/pull/42');
  });

  it('does not skip after the label is removed', (): void => {
    const result = runGate('label-removed');

    expect(result.status).not.toBe(0);
    expect(result.summary).not.toContain('CI gate skipped');
  });
});
