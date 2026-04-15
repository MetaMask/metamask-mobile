/* eslint-disable import-x/no-nodejs-modules */
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type {
  VisualCheckResult,
  VisualAIProvider,
  ClaudeProviderConfig,
} from './index.ts';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 2048;

export class ClaudeProvider implements VisualAIProvider {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(config?: ClaudeProviderConfig) {
    this.client = new Anthropic({ apiKey: config?.apiKey });
    this.model = config?.model ?? DEFAULT_MODEL;
    this.maxTokens = config?.maxTokens ?? DEFAULT_MAX_TOKENS;
  }

  async analyzeImage(
    prompt: string,
    imagePath: string,
  ): Promise<VisualCheckResult> {
    const imageBlock = this._imageToContentBlock(imagePath);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [
        {
          role: 'user',
          content: [imageBlock, { type: 'text', text: prompt }],
        },
      ],
    });

    const raw = this._extractText(response);
    return this._parseAnalysisResponse(raw);
  }

  async compareImages(
    prompt: string,
    baselinePath: string,
    currentPath: string,
  ): Promise<VisualCheckResult> {
    const baselineBlock = this._imageToContentBlock(baselinePath);
    const currentBlock = this._imageToContentBlock(currentPath);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'BASELINE IMAGE:' },
            baselineBlock,
            { type: 'text', text: 'CURRENT IMAGE:' },
            currentBlock,
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const raw = this._extractText(response);
    return this._parseComparisonResponse(raw);
  }

  private _imageToContentBlock(imagePath: string): Anthropic.ImageBlockParam {
    const absolutePath = resolve(imagePath);
    const data = readFileSync(absolutePath).toString('base64');
    return {
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data },
    };
  }

  private _extractText(response: Anthropic.Message): string {
    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
  }

  private _parseComparisonResponse(raw: string): VisualCheckResult {
    const regressions = this._extractSection(raw, 'REGRESSIONS FOUND');
    const acceptableVariations = this._extractSection(
      raw,
      'ACCEPTABLE VARIATIONS',
    );
    const summary = this._extractSummaryLine(raw, 'OVERALL ASSESSMENT');

    const hasNoRegressions =
      regressions.length === 0 ||
      regressions.every((r) => r.toLowerCase() === 'none');

    const overallSaysPass = summary.toLowerCase().startsWith('pass');

    const passed = hasNoRegressions && overallSaysPass;

    return {
      passed,
      regressions: hasNoRegressions ? [] : regressions,
      acceptableVariations,
      summary,
      rawResponse: raw,
    };
  }

  private _parseAnalysisResponse(raw: string): VisualCheckResult {
    const issues = this._extractSection(raw, 'ISSUES FOUND');
    const summary = this._extractSummaryLine(raw, 'OVERALL ASSESSMENT');

    const hasNoIssues =
      issues.length === 0 || issues.every((i) => i.toLowerCase() === 'none');

    const overallSaysPass = summary.toLowerCase().startsWith('pass');

    const passed = hasNoIssues && overallSaysPass;

    return {
      passed,
      regressions: hasNoIssues ? [] : issues,
      acceptableVariations: [],
      summary,
      rawResponse: raw,
    };
  }

  private _extractSection(raw: string, heading: string): string[] {
    const sectionHeadings = [
      'BASELINE COMPARISON',
      'REGRESSIONS FOUND',
      'ACCEPTABLE VARIATIONS',
      'OVERALL ASSESSMENT',
      'SUMMARY',
      'ISSUES FOUND',
    ];
    const otherHeadings = sectionHeadings
      .filter((h) => h !== heading)
      .map((h) => h.replace(/\s+/g, '\\s+'))
      .join('|');

    const pattern = new RegExp(
      `${heading.replace(/\s+/g, '\\s+')}[:\\s]*([\\s\\S]*?)(?=(?:${otherHeadings})[:\\s]|$)`,
      'i',
    );
    const match = raw.match(pattern);
    if (!match?.[1]) return [];

    return match[1]
      .split('\n')
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter((line) => line.length > 0);
  }

  private _extractSummaryLine(raw: string, heading: string): string {
    const pattern = new RegExp(`${heading}[:\\s]*(.+)`, 'i');
    const match = raw.match(pattern);
    return match?.[1]?.trim() ?? '';
  }
}
