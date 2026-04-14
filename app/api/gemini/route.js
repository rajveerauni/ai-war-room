import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const grok = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});
const MODEL = 'grok-3';

export async function POST(req) {
  if (!process.env.XAI_API_KEY) {
    return NextResponse.json({ error: 'XAI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { type, prompt, history, systemPrompt } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    let messages = [];

    if (type === 'chat') {
      // Add system context as a system message
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      // Add prior conversation history
      (history || []).forEach((msg) => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.text,
        });
      });
      // Add the new user message
      messages.push({ role: 'user', content: prompt });
    } else {
      // Single-turn generation (competitor analysis, reports)
      messages = [{ role: 'user', content: prompt }];
    }

    const response = await grok.chat.completions.create({
      messages,
      model: MODEL,
    });

    const text = response.choices[0]?.message?.content || '';
    return NextResponse.json({ text });

  } catch (err) {
    console.error('[Grok API Error]', err.message);
    return NextResponse.json({ error: err.message || 'Failed to generate response' }, { status: 500 });
  }
}
