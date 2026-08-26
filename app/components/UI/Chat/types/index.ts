export interface ChatToolCall {
  toolCallId: string;
  toolName: string;
  status: 'running' | 'done' | 'error';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  toolCalls: ChatToolCall[];
  status: 'pending' | 'streaming' | 'done' | 'error';
}
