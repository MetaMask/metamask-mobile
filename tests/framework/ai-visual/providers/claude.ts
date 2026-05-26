// eslint-disable-next-line import-x/no-nodejs-modules
import fs from 'fs';
// eslint-disable-next-line import-x/no-nodejs-modules
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import type {
  AIProvider,
  AIProviderConfig,
  AIAnalysisResult,
  AIComparisonResult,
} from './types';

type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

const MEDIA_TYPE_BY_EXT: Record<string, ImageMediaType> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 2048;

export class ClaudeProvider implements AIProvider {
  readonly name = 'claude';

  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(config: AIProviderConfig = {}) {
    const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is required for the Claude provider. ' +
          'Set it in .e2e.env or pass it via AIProviderConfig.',
      );
    }

    this.model = config.model ?? DEFAULT_MODEL;
    this.maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.client = new Anthropic({ apiKey });
  }

  async analyzeImage(
    prompt: string,
    image: string | Buffer,
  ): Promise<AIAnalysisResult> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'user',
            content: [
              this.toContentBlock(image),
              { type: 'text', text: prompt },
            ],
          },
        ],
      });

      const rawResponse =
        response.content[0].type === 'text' ? response.content[0].text : '';
      return ClaudeProvider.parseAnalysisResponse(rawResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Claude analysis failed:', message);
      return {
        success: false,
        passed: false,
        summary: `Analysis failed: ${message}`,
        issues: [],
        rawResponse: '',
      };
    }
  }

  async compareImages(
    prompt: string,
    baselineImage: string | Buffer,
    currentImage: string | Buffer,
  ): Promise<AIComparisonResult> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'BASELINE (expected) screenshot:' },
              this.toContentBlock(baselineImage),
              { type: 'text', text: 'CURRENT (test) screenshot:' },
              this.toContentBlock(currentImage),
              { type: 'text', text: prompt },
            ],
          },
        ],
      });

      const rawResponse =
        response.content[0].type === 'text' ? response.content[0].text : '';
      return ClaudeProvider.parseComparisonResponse(rawResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Claude comparison failed:', message);
      return {
        success: false,
        passed: false,
        summary: `Comparison failed: ${message}`,
        regressions: [],
        warnings: [],
        acceptableVariations: [],
        rawResponse: '',
      };
    }
  }

  private toContentBlock(
    image: string | Buffer,
  ): Anthropic.Messages.ImageBlockParam {
    let buffer: Buffer;
    let mediaType: ImageMediaType = 'image/png';

    if (typeof image === 'string') {
      buffer = fs.readFileSync(image);
      const ext = path.extname(image).toLowerCase();
      mediaType = MEDIA_TYPE_BY_EXT[ext] ?? 'image/png';
    } else {
      buffer = image;
    }

    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: buffer.toString('base64'),
      },
    };
  }

  private static extractBulletItems(text: string): string[] {
    const matches = text.match(/[-\u2022]\s*(.+?)(?=\n|$)/g);
    if (!matches) return [];
    return matches
      .map((m) => m.replace(/^[-\u2022]\s*/, '').trim())
      .filter(Boolean);
  }

  private static parseAnalysisResponse(rawResponse: string): AIAnalysisResult {
    const hasFail =
      /\b(fail|failed|issue|problem|bug|error|missing|broken)\b/i.test(
        rawResponse,
      );
    const hasPass =
      /\b(pass|passed|correct|good|proper|looks good|no issues)\b/i.test(
        rawResponse,
      );

    const issues: string[] = hasFail
      ? ClaudeProvider.extractBulletItems(rawResponse)
      : [];

    const summaryMatch = rawResponse.match(
      /(?:summary|overall|conclusion)[:\s]*(.+?)(?=\n\n|$)/i,
    );
    const summary = summaryMatch
      ? summaryMatch[1].trim()
      : rawResponse.split('\n')[0].slice(0, 200);

    return {
      success: true,
      passed: !hasFail || hasPass,
      summary,
      issues,
      rawResponse,
    };
  }

  private static parseComparisonResponse(
    rawResponse: string,
  ): AIComparisonResult {
    const hasRegression =
      /\b(regression|difference|changed|missing|removed|broken|fail)\b/i.test(
        rawResponse,
      );
    const hasPass =
      /\b(pass|passed|no regression|identical|match|same)\b/i.test(rawResponse);

    const regressions: string[] = [];
    const regressionsMatch = rawResponse.match(
      /REGRESSIONS FOUND[:\s]*([\s\S]*?)(?=ACCEPTABLE|OVERALL|$)/i,
    );
    if (regressionsMatch) {
      regressions.push(
        ...ClaudeProvider.extractBulletItems(regressionsMatch[1]),
      );
    }

    const warnings: string[] = [];
    const warningsMatch = rawResponse.match(
      /WARNINGS[:\s]*([\s\S]*?)(?=ACCEPTABLE|OVERALL|$)/i,
    );
    if (warningsMatch) {
      warnings.push(...ClaudeProvider.extractBulletItems(warningsMatch[1]));
    }

    const acceptableVariations: string[] = [];
    const variationsMatch = rawResponse.match(
      /ACCEPTABLE VARIATIONS[:\s]*([\s\S]*?)(?=OVERALL|$)/i,
    );
    if (variationsMatch) {
      acceptableVariations.push(
        ...ClaudeProvider.extractBulletItems(variationsMatch[1]),
      );
    }

    const overallMatch = rawResponse.match(
      /OVERALL ASSESSMENT[:\s]*([\s\S]*?)$/i,
    );
    let passed = !hasRegression || hasPass;
    if (overallMatch) {
      const assessment = overallMatch[1].toLowerCase();
      passed = assessment.includes('pass') && !assessment.includes('fail');
    }

    const realRegressions = regressions.filter(
      (r) => !r.toLowerCase().includes('none'),
    );
    if (realRegressions.length > 0) {
      passed = false;
    }

    const realWarnings = warnings.filter(
      (w) => !w.toLowerCase().includes('none'),
    );

    const summaryMatch = rawResponse.match(
      /BASELINE COMPARISON[:\s]*(.+?)(?=\n|$)/i,
    );
    const summary = summaryMatch
      ? summaryMatch[1].trim()
      : rawResponse.split('\n')[0].slice(0, 200);

    return {
      success: true,
      passed,
      summary,
      regressions: realRegressions,
      warnings: realWarnings,
      acceptableVariations,
      rawResponse,
    };
  }
}
