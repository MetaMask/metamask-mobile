import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  rmSync,
} from 'fs';
import { join } from 'path';
import { stringify } from 'yaml';

interface BaselineStep {
  screenshot: Buffer;
  description: string;
}

interface BaselineMetadata {
  flowName: string;
  savedAt: string;
  stepCount: number;
}

export class BaselineManager {
  constructor(private baseDir: string) {
    mkdirSync(baseDir, { recursive: true });
  }

  private stepPath(flowName: string, stepId: number, ext: string): string {
    return join(
      this.baseDir,
      flowName,
      `${String(stepId).padStart(3, '0')}${ext}`,
    );
  }

  saveStep(
    flowName: string,
    stepId: number,
    screenshot: Buffer,
    description: string,
  ): void {
    const dir = join(this.baseDir, flowName);
    mkdirSync(dir, { recursive: true });
    writeFileSync(this.stepPath(flowName, stepId, '.png'), screenshot);
    writeFileSync(
      this.stepPath(flowName, stepId, '.desc.txt'),
      description,
      'utf-8',
    );
  }

  saveMetadata(flowName: string, stepCount: number): void {
    const dir = join(this.baseDir, flowName);
    mkdirSync(dir, { recursive: true });
    const metadata: BaselineMetadata = {
      flowName,
      savedAt: new Date().toISOString(),
      stepCount,
    };
    writeFileSync(join(dir, 'metadata.yaml'), stringify(metadata), 'utf-8');
  }

  loadStep(flowName: string, stepId: number): BaselineStep | null {
    const pngPath = this.stepPath(flowName, stepId, '.png');
    const descPath = this.stepPath(flowName, stepId, '.desc.txt');

    if (!existsSync(pngPath)) return null;

    return {
      screenshot: readFileSync(pngPath),
      description: existsSync(descPath) ? readFileSync(descPath, 'utf-8') : '',
    };
  }

  listBaselines(): string[] {
    if (!existsSync(this.baseDir)) return [];
    return readdirSync(this.baseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  }

  deleteBaseline(flowName: string): void {
    const dir = join(this.baseDir, flowName);
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true });
    }
  }

  hasBaseline(flowName: string): boolean {
    return existsSync(join(this.baseDir, flowName));
  }

  getBaselineDir(flowName: string): string {
    return join(this.baseDir, flowName);
  }
}
