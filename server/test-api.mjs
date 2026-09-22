// API Integration Test Script
const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Starting API Integration Tests ---');
  
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  let token = '';
  let conversationId = '';

  // 1. Register
  console.log('\n1. Testing POST /api/auth/register...');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword, name: 'Test User' }),
  });
  const regData = await regRes.json();
  if (regRes.status !== 201 || !regData.token) {
    throw new Error(`Register failed: ${JSON.stringify(regData)}`);
  }
  token = regData.token;
  console.log('✓ Register successful! User:', regData.user.email);

  // 2. Login
  console.log('\n2. Testing POST /api/auth/login...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  const loginData = await loginRes.json();
  if (loginRes.status !== 200 || !loginData.token) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }
  console.log('✓ Login successful! Token received');

  // 3. Get /me
  console.log('\n3. Testing GET /api/auth/me...');
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData = await meRes.json();
  if (meRes.status !== 200 || meData.user.email !== testEmail) {
    throw new Error(`Get /me failed: ${JSON.stringify(meData)}`);
  }
  console.log('✓ Get /me successful! User ID:', meData.user.id);

  // 4. Create Conversation
  console.log('\n4. Testing POST /api/conversations...');
  const createConvRes = await fetch(`${BASE_URL}/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'Test Discussion',
      model: 'gemini-2.5-flash',
      systemPrompt: 'You are a helpful coding assistant.',
      temperature: 0.5,
    }),
  });
  const createConvData = await createConvRes.json();
  if (createConvRes.status !== 201 || !createConvData.conversation) {
    throw new Error(`Create conversation failed: ${JSON.stringify(createConvData)}`);
  }
  conversationId = createConvData.conversation.id;
  console.log('✓ Conversation created! ID:', conversationId);

  // 5. List Conversations
  console.log('\n5. Testing GET /api/conversations...');
  const listRes = await fetch(`${BASE_URL}/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = await listRes.json();
  if (listRes.status !== 200 || !Array.isArray(listData.conversations) || listData.conversations.length === 0) {
    throw new Error(`List conversations failed: ${JSON.stringify(listData)}`);
  }
  console.log('✓ List conversations successful! Total conversations:', listData.conversations.length);

  // 6. Update Conversation
  console.log('\n6. Testing PATCH /api/conversations/:id...');
  const updateRes = await fetch(`${BASE_URL}/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title: 'Updated Title', temperature: 0.8 }),
  });
  const updateData = await updateRes.json();
  if (updateRes.status !== 200 || updateData.conversation.title !== 'Updated Title') {
    throw new Error(`Update conversation failed: ${JSON.stringify(updateData)}`);
  }
  console.log('✓ Update conversation successful! New Title:', updateData.conversation.title);

  // 7. Test Streaming Chat Endpoint
  console.log('\n7. Testing POST /api/chat/stream (SSE)...');
  const streamRes = await fetch(`${BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      conversationId,
      message: 'Hello, what is 2 + 2? Please answer in one word.',
    }),
  });

  if (streamRes.status !== 200) {
    throw new Error(`Stream request failed with status: ${streamRes.status}`);
  }

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();
  let receivedText = '';
  let streamCompleted = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    
    // Parse SSE lines
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.replace('data: ', '').trim();
        if (payload === '[DONE]') {
          streamCompleted = true;
        } else {
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) receivedText += parsed.text;
          } catch (e) {}
        }
      }
    }
  }

  console.log('✓ SSE Stream received successfully!');
  console.log('Streamed text preview:', receivedText.slice(0, 100));

  // 8. Verify Persisted Messages in Conversation
  console.log('\n8. Testing GET /api/conversations/:id (persisted messages)...');
  const getConvRes = await fetch(`${BASE_URL}/conversations/${conversationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const getConvData = await getConvRes.json();
  const messages = getConvData.conversation.messages;
  console.log(`✓ Retrieved conversation messages count: ${messages.length}`);
  if (messages.length < 2) {
    throw new Error(`Expected at least 2 messages (user + assistant), found: ${messages.length}`);
  }
  console.log('  User message:', messages[0].content);
  console.log('  Assistant message:', messages[1].content.slice(0, 80) + '...');

  console.log('\n🎉 ALL BACKEND API TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});

