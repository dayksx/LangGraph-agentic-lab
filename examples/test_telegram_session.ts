import 'dotenv/config';
import { TelegramClient } from '../src/clients/TelegramClient.js';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';

async function testTelegramSession() {
  console.log('🧪 Testing Telegram Client Session Management...');
  
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN environment variable is required');
    process.exit(1);
  }

  const client = new TelegramClient();
  
  // Test 1: Simulate receiving a message with metadata
  console.log('\n📝 Test 1: Simulating message with metadata');
  const testMessage = new HumanMessage('Hello, this is a test message');
  (testMessage as any).metadata = {
    chatId: 123456789,
    userId: 987654321,
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    responseHandlerId: 'test_handler_123'
  };
  
  // Simulate the response handler being created
  (client as any).responseHandlers.set('test_handler_123', async (response: BaseMessage) => {
    console.log(`📤 Mock response handler called with: ${response.content}`);
  });
  
  // Test 2: Simulate sending a response
  console.log('📤 Test 2: Simulating response with preserved metadata');
  const responseMessage = new AIMessage('This is a test response from the agent');
  (responseMessage as any).metadata = {
    chatId: 123456789,
    userId: 987654321,
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    responseHandlerId: 'test_handler_123'
  };
  
  // Test the sendMessage method
  await client.sendMessage(responseMessage);
  
  // Test 3: Verify handler cleanup
  console.log('🧹 Test 3: Verifying handler cleanup');
  const handlerExists = (client as any).responseHandlers.has('test_handler_123');
  console.log(`Handler 'test_handler_123' exists: ${handlerExists}`);
  
  // Test 4: Test with no session
  console.log('\n📝 Test 4: Testing response with no session');
  const noSessionResponse = new AIMessage('This response has no session');
  await client.sendMessage(noSessionResponse);
  
  console.log('\n✅ Session management tests completed!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testTelegramSession().catch(console.error);
} 