/**
 * Skill Executor
 *
 * Executes skills using the agentic loop pattern.
 * Extracted from analyzer.ts to be skill-agnostic.
 */

import { Skill } from './Skill';
import { SkillContext, ToolInput } from '../../types';
import { ILLMProvider } from '../../providers';
import {
  LLMMessage,
  LLMContentBlock,
  LLMTool,
  LLMToolResultBlock,
} from '../../providers/types';
import { executeTool } from '../../ai-tools/tool-executor';
import { LLM_CONFIG } from '../../config';

/**
 * Executes skills using an agentic loop pattern with LLM-driven tool usage.
 *
 * @template SkillInput - The input type expected by the skill (defaults to void)
 * @template SkillOutput - The output type returned by the skill (defaults to unknown)
 */
export class SkillExecutor<SkillInput = void, SkillOutput = unknown> {
  private skill: Skill<SkillInput, SkillOutput>;

  constructor(skill: Skill<SkillInput, SkillOutput>) {
    this.skill = skill;
  }

  /**
   * Execute the skill using the agentic loop
   */
  async execute(
    provider: ILLMProvider,
    context: SkillContext,
    input?: SkillInput,
  ): Promise<SkillOutput> {
    // Validate dependencies before execution
    this.skill.validateDependencies();

    // Build prompts
    const systemPrompt = this.skill.buildSystemPrompt(context);
    const taskPrompt = this.skill.buildTaskPrompt(context, input);
    const tools = this.skill.getTools();
    const finalizeToolName = this.skill.getFinalizeToolName();

    // Run agentic loop (uses global LLM_CONFIG)
    const rawResult = await this.runAgenticLoop(
      provider,
      systemPrompt,
      taskPrompt,
      tools,
      finalizeToolName,
      context,
    );

    // Process result
    const processed = await this.skill.processResult(rawResult);
    if (processed) {
      return processed;
    }

    // Fallback to conservative result
    console.log('⚠️ Using fallback analysis');
    return this.skill.createConservativeResult(context);
  }

  /**
   * Run the agentic loop (extracted from analyzer.ts)
   * Uses global LLM_CONFIG for all configuration
   */
  private async runAgenticLoop(
    provider: ILLMProvider,
    systemPrompt: string,
    taskPrompt: string,
    tools: LLMTool[],
    finalizeToolName: string,
    context: SkillContext,
  ): Promise<string> {
    let currentMessage: LLMContentBlock[] | string = taskPrompt;
    const conversationHistory: LLMMessage[] = [];

    console.log(`🤖 Using provider: ${provider.displayName}`);

    for (let iteration = 0; iteration < LLM_CONFIG.maxIterations; iteration++) {
      console.log(
        `🔄 Iteration ${iteration + 1}/${LLM_CONFIG.maxIterations}...`,
      );

      const response = await provider.createMessage({
        model: provider.getDefaultModel(),
        maxTokens: LLM_CONFIG.maxTokens,
        temperature: LLM_CONFIG.temperature,
        system: systemPrompt,
        tools,
        messages: [
          ...conversationHistory,
          { role: 'user', content: currentMessage },
        ],
      });

      // Handle tool uses
      const toolUseBlocks = response.content.filter(
        (block) => block.type === 'tool_use',
      );

      if (toolUseBlocks.length > 0) {
        const toolResults: LLMToolResultBlock[] = [];

        for (const toolUse of toolUseBlocks) {
          if (toolUse.type === 'tool_use') {
            console.log(`🔧 Tool: ${toolUse.name}`);
            const toolResult = await executeTool(
              toolUse.name,
              toolUse.input as ToolInput,
              {
                baseDir: context.baseDir,
                baseBranch: context.baseBranch,
                prNumber: context.prNumber,
                githubRepo: context.githubRepo,
              },
            );

            // Log tool result with status indicator
            const errorPattern =
              /^(Error:|Invalid|Tool error:|Unknown tool:|File not found:|Directory not found:)|Error (searching|finding|reading)|Could not get|Cannot extract/;
            const emptyPattern =
              /No (matches found|git diff|related|importers)/;

            const isError = errorPattern.test(toolResult);
            const isEmpty = emptyPattern.test(toolResult);

            let status = '✅';
            if (isError) status = '❌';
            else if (isEmpty) status = '📭';

            const resultPreview = toolResult
              .substring(0, 120)
              .replace(/\n/g, ' ');
            console.log(
              `   ${status} ${resultPreview}${toolResult.length > 120 ? '...' : ''}`,
            );

            // Handle finalize tool
            if (toolUse.name === finalizeToolName) {
              console.log(`✅ Analysis complete!`);
              return toolResult;
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: toolResult.substring(0, 50000),
            });
          }
        }

        // Update conversation history
        conversationHistory.push({
          role: 'user',
          content: currentMessage,
        });
        conversationHistory.push({
          role: 'assistant',
          content: response.content,
        });

        currentMessage = toolResults;
        continue;
      }

      // Handle text response (fallback)
      const textContent = response.content.find(
        (block) => block.type === 'text',
      );
      if (textContent && textContent.type === 'text') {
        return textContent.text;
      }

      break;
    }

    // Return empty result if loop completes without finalize
    return '';
  }
}
