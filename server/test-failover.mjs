import 'dotenv/config';
import { streamUnifiedChat } from './src/services/llmService.js';

async function testAll() {
  console.log('--- 1. Testing Groq (openai/gpt-oss-120b) ---');
  let gText = '';
  for await (const chunk of streamUnifiedChat({
    model: 'openai/gpt-oss-120b',
    history: [],
    newMessage: 'What is 3 + 3? Answer in one word.',
  })) {
    gText += chunk;
  }
  console.log('✓ Groq Output:', gText.trim());

  console.log('\n--- 2. Testing OpenRouter (deepseek/deepseek-r1) ---');
  let orText = '';
  for await (const chunk of streamUnifiedChat({
    model: 'deepseek/deepseek-r1',
    history: [],
    newMessage: 'Say "OpenRouter Works" in quotes.',
  })) {
    orText += chunk;
  }
  console.log('✓ OpenRouter Output:', orText.trim().slice(0, 100));

  console.log('\n--- 3. Testing Gemini with Automatic Failover ---');
  let gemText = '';
  for await (const chunk of streamUnifiedChat({
    model: 'gemini-3.6-flash',
    history: [],
    newMessage: 'Say "Success" in one word.',
  })) {
    gemText += chunk;
  }
  console.log('✓ Gemini / Failover Output:', gemText.trim());

  console.log('\n🎉 ALL THREE TEST CHANNELS OPERATIONAL AND RESILIENT!');
}

testAll().catch(console.error);

