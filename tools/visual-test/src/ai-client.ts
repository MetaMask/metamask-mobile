import { AiNavigationResponse, AiEvaluationResponse } from './types';

const NAVIGATE_SYSTEM_PROMPT = `You are an AI assistant that navigates a mobile app by looking at screenshots.
You will receive a screenshot of the current screen and a goal to achieve.

Respond with a JSON object (no markdown, no code fences):
{
  "observation": "describe what you see on screen",
  "action": { "type": "tap|swipe|type|back|home|wait|launch_app", ...action-specific fields },
  "done": true/false (true if the goal has been achieved),
  "issue": "optional - describe any visual issue you notice"
}

Action formats:
- tap: { "type": "tap", "target": "element name", "coords": [x, y] }
- swipe: { "type": "swipe", "target": "description", "from": [x, y], "to": [x, y] }
- type: { "type": "type", "target": "field name", "text": "text to type" }
- back: { "type": "back" }
- home: { "type": "home" }
- wait: { "type": "wait", "ms": 1000 }
- launch_app: { "type": "launch_app", "packageId": "io.metamask" }

Coordinates should be pixel values based on the screenshot dimensions. Be precise.`;

const EVALUATE_SYSTEM_PROMPT = `You are evaluating a mobile app screen for visual regressions.
Compare the current screenshot against the baseline (if provided).

Respond with a JSON object (no markdown, no code fences):
{
  "verdict": "pass|warning|regression",
  "summary": "one-line description",
  "details": "what changed, if anything",
  "severity": "low|medium|high"
}

Criteria:
- pass: screen matches baseline / looks correct
- warning: minor differences (text changes, new elements) that may be intentional
- regression: broken layout, missing elements, overlapping text, crashes, wrong screen`;

export class AiClient {
  constructor(
    private endpoint: string,
    private model: string,
    private apiKey: string | null,
  ) {}

  async navigate(
    screenshotBase64: string,
    goal: string,
    history: Array<{ observation: string; action: string }>,
  ): Promise<AiNavigationResponse> {
    const historyText =
      history.length > 0
        ? '\n\nPrevious steps:\n' +
          history
            .map(
              (h, i) => `${i + 1}. Saw: ${h.observation} -> Did: ${h.action}`,
            )
            .join('\n')
        : '';

    const messages = [
      { role: 'system' as const, content: NAVIGATE_SYSTEM_PROMPT },
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: `Goal: ${goal}${historyText}\n\nWhat do you see? What action should I take next?`,
          },
          {
            type: 'image_url' as const,
            image_url: { url: `data:image/png;base64,${screenshotBase64}` },
          },
        ],
      },
    ];

    const responseText = await this.chat(messages);
    return this.parseJson<AiNavigationResponse>(responseText);
  }

  async evaluate(
    currentBase64: string,
    baselineBase64: string | null,
    baselineDescription: string | null,
  ): Promise<AiEvaluationResponse> {
    const content: any[] = [];

    if (baselineDescription) {
      content.push({
        type: 'text',
        text: `Baseline description: "${baselineDescription}"`,
      });
    }

    if (baselineBase64) {
      content.push(
        { type: 'text', text: 'Baseline screenshot:' },
        {
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${baselineBase64}` },
        },
      );
    }

    content.push(
      {
        type: 'text',
        text: baselineBase64
          ? 'Current screenshot (compare against baseline):'
          : 'Current screenshot (check for obvious issues):',
      },
      {
        type: 'image_url',
        image_url: { url: `data:image/png;base64,${currentBase64}` },
      },
    );

    const messages = [
      { role: 'system' as const, content: EVALUATE_SYSTEM_PROMPT },
      { role: 'user' as const, content },
    ];

    const responseText = await this.chat(messages);
    return this.parseJson<AiEvaluationResponse>(responseText);
  }

  private async chat(messages: any[]): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: 1024,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI API error (${response.status}): ${text}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private parseJson<T>(text: string): T {
    const cleaned = text
      .replace(/^```(?:json)?\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim();
    return JSON.parse(cleaned);
  }
}
