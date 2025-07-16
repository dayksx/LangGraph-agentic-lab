import 'dotenv/config';
import { AgenticPlatform } from '../src/index.js';
import { TelegramClient } from '../src/clients/TelegramClient.js';
import { agentPersonas } from '../src/config/personas.js';
import { SearchPlugin } from '../src/plugins/SearchPlugin.js';
import { ERC20Plugin } from '../src/plugins/ERC20Plugin.js';
import { StartupEvaluationPlugin } from '../src/plugins/StartupEvaluationPlugin.js';

async function telegramExample() {
  console.log('🤖 Starting Telegram Bot Example...');
  
  // Check if Telegram token is available
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN environment variable is required');
    console.log('💡 To get a bot token:');
    console.log('   1. Message @BotFather on Telegram');
    console.log('   2. Send /newbot command');
    console.log('   3. Follow the instructions');
    console.log('   4. Add the token to your .env file');
    process.exit(1);
  }

  const platform = new AgenticPlatform();
  
  // Register agents
  await platform.registerAgent("oracle", {
    modelName: "gpt-4",
    temperature: 0.5,
    tools: [],
    persona: agentPersonas.oracle
  });
  
  await platform.registerAgent("analyst", {
    modelName: "gpt-4",
    temperature: 0.7,
    tools: [],
    persona: agentPersonas.analyst
  });
  
  await platform.registerAgent("degen", {
    modelName: "gpt-4",
    temperature: 0.9,
    tools: [],
    persona: agentPersonas.degen
  });
  
  // Register plugins
  await Promise.all([
    platform.registerPluginForAgent("oracle", new SearchPlugin()),
    platform.registerPluginForAgent("analyst", new StartupEvaluationPlugin()),
    platform.registerPluginForAgent("degen", new ERC20Plugin())
  ]);

  // Define the coordinator workflow
  await platform.defineCoordinatorWorkflow();
  
  // Register Telegram client
  await platform.registerClient(new TelegramClient());
  
  console.log('✅ Telegram bot setup complete!');
  console.log('📱 Your bot is now running on Telegram');
  console.log('🔗 Users can find your bot and start chatting');
  console.log('💡 Try sending messages like:');
  console.log('   • "What is artificial intelligence?"');
  console.log('   • "Analyze this startup idea: A mobile app for pet owners"');
  console.log('   • "How do I transfer ERC20 tokens?"');
  
  // Start the platform
  await platform.start();
  
  // Keep the process running
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await platform.stop();
    process.exit(0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  telegramExample().catch(console.error);
} 