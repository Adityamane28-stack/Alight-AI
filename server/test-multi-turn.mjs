import 'dotenv/config';
import { streamGeminiChat } from './src/services/geminiService.js';

async function run() {
  console.log('Testing turn 1 (model: gemini-3.8-flash)...');
  let t1 = '';
  for await (const chunk of streamGeminiChat({
    model: 'gemini-3.8-flash',
    history: [],
    newMessage: 'What is 10 + 5? Answer with number only.',
  })) {
    t1 += chunk;
  }
  console.log('Turn 1 Output:', t1.trim());

  console.log('\nTesting turn 2 with previous history...');
  let t2 = '';
  for await (const chunk of streamGeminiChat({
    model: 'gemini-3.8-flash',
    history: [
      { role: 'user', content: 'What is 10 + 5? Answer with number only.' },
      { role: 'assistant', content: t1 }
    ],
    newMessage: 'Now multiply that by 2. Answer with number only.',
  })) {
    t2 += chunk;
  }
  console.log('Turn 2 Output:', t2.trim());

  console.log('\nTesting turn 3 (code generation in Java)...');
  let t3 = '';
  for await (const chunk of streamGeminiChat({
    model: 'gemini-3.8-flash',
    history: [
      { role: 'user', content: 'What is 10 + 5? Answer with number only.' },
      { role: 'assistant', content: t1 },
      { role: 'user', content: 'Now multiply that by 2. Answer with number only.' },
      { role: 'assistant', content: t2 }
    ],
    newMessage: 'Give a 2-line Java method for adding two numbers.',
  })) {
    t3 += chunk;
  }
  console.log('Turn 3 Output:\n', t3.trim());

  console.log('\n✅ ALL 3 TURNS SUCCEEDED SEAMLESSLY!');
}

run().catch(console.error);

