import path from 'path';
import { orchestrate } from '../maestro/orchestrator';
import { rewriteFlowForCapture } from './rewrite-flow';

const FLOWS_DIR = path.join(__dirname, 'flows');
const TMP_DIR = path.join(__dirname, '.tmp');

const updateBaselines = process.argv.includes('--update-baselines');

if (updateBaselines) {
  console.log('Mode: update-baselines (assertScreenshot -> takeScreenshot)\n');
}

orchestrate({
  defaultFlowsDir: FLOWS_DIR,
  tmpDir: TMP_DIR,
  transformFlow: updateBaselines ? rewriteFlowForCapture : undefined,
}).catch((err) => {
  console.error('Orchestrator error:', err);
  process.exit(1);
});
