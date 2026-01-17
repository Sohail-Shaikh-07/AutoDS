import { apiClient } from '../../api/client';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'thought' | 'text' | 'error'; 
}

export const sendMessageStream = async (
  prompt: string, 
  sessionId: string,
  onChunk: (chunk: any) => void
) => {
  const response = await fetch(`${apiClient.defaults.baseURL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, session_id: sessionId }),
  });

  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep the last partial line in buffer

    for (const line of lines) {
      if (line.trim()) {
        try {
          const json = JSON.parse(line);
          onChunk(json);
        } catch (e) {
          console.error("Error parsing stream chunk", e);
        }
      }
    }
  }
};