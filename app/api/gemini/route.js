import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

export async function POST(req) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { type, prompt, history, systemPrompt } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    let messages = [];

    if (type === 'chat') {
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      (history || []).forEach((msg) => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.text,
        });
      });
      messages.push({ role: 'user', content: prompt });
    } else {
      messages = [{ role: 'user', content: prompt }];
    }

    const response = await groq.chat.completions.create({
      messages,
      model: MODEL,
    });

    const text = response.choices[0]?.message?.content || '';
    return NextResponse.json({ text });

  } catch (err) {
    console.error('[Groq API Error]', err.message);
    return NextResponse.json({ error: err.message || 'Failed to generate response' }, { status: 500 });
  }
}
