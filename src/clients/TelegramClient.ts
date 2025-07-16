import { Client, ClientConfig } from './Client';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { Telegraf, Context } from 'telegraf';

export class TelegramClient implements Client {
  public config: ClientConfig = {
    name: 'telegram',
    type: 'telegram',
    enabled: true
  };

  private bot: Telegraf;
  private messageCallback: ((message: BaseMessage) => Promise<void>) | null = null;
  private isRunning: boolean = false;
  private responseHandlers: Map<string, (response: BaseMessage) => Promise<void>> = new Map();

  constructor(token?: string) {
    const botToken = token || process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error('Telegram bot token is required. Set TELEGRAM_BOT_TOKEN environment variable or pass it to the constructor.');
    }
    
    this.bot = new Telegraf(botToken);
    this.setupBotHandlers();
  }

  public async initialize(): Promise<void> {
    // Bot is initialized in constructor
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Telegram client is already running');
      return;
    }

    try {
      await this.bot.launch();
      this.isRunning = true;
      console.log('🤖 Telegram bot started successfully!');
      console.log('📱 You can now interact with the bot on Telegram');
    } catch (error) {
      console.error('Failed to start Telegram bot:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.bot.stop('SIGINT');
      this.isRunning = false;
      console.log('Telegram bot stopped');
    } catch (error) {
      console.error('Error stopping Telegram bot:', error);
    }
  }

  public async sendMessage(message: BaseMessage): Promise<void> {
    // Extract response handler ID from message metadata
    const metadata = (message as any).metadata;
    if (metadata && metadata.responseHandlerId) {
      const handler = this.responseHandlers.get(metadata.responseHandlerId);
      if (handler) {
        try {
          await handler(message);
          // Clean up the handler after use
          this.responseHandlers.delete(metadata.responseHandlerId);
        } catch (error) {
          console.error('Error in response handler:', error);
        }
      } else {
        console.log('Agent response (no response handler found):', message.content);
      }
    } else {
      console.log('Agent response (no response handler ID):', message.content);
    }
  }

  public onMessage(callback: (message: BaseMessage) => Promise<void>): void {
    this.messageCallback = callback;
  }

  private generateHandlerId(): string {
    return `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupBotHandlers(): void {
    // Handle /start command
    this.bot.start((ctx) => {
      const welcomeMessage = `🤖 Welcome to the Agentic Platform Bot!

I'm your AI assistant with multiple specialized agents:
• 🧠 Oracle: General knowledge and research
• 📊 Analyst: Financial analysis and startup evaluation  
• 🚀 Degen: Onchain operations and token management

Just send me a message and I'll route it to the best agent for your needs!

Try asking:
• "What's the weather like?" (Oracle)
• "Analyze this startup idea" (Analyst)
• "How do I transfer tokens?" (Degen)`;
      
      ctx.reply(welcomeMessage);
    });

    // Handle /help command
    this.bot.help((ctx) => {
      const helpMessage = `🔧 Available commands:
/start - Welcome message
/help - Show this help
/status - Check bot status

💡 Just send me any message and I'll help you with:
• General questions and research
• Financial analysis and startup evaluation
• Onchain operations and token management
• And much more!`;
      
      ctx.reply(helpMessage);
    });

    // Handle /status command
    this.bot.command('status', (ctx) => {
      const statusMessage = `✅ Bot Status: Online
🤖 Platform: Agentic Platform
📊 Agents: Oracle, Analyst, Degen
🔄 Ready to process your requests!`;
      
      ctx.reply(statusMessage);
    });

    // Handle text messages
    this.bot.on('text', async (ctx) => {
      const userMessage = ctx.message.text;
      const chatId = ctx.chat.id;
      
      console.log(`📨 Received message from ${ctx.from?.username || ctx.from?.first_name}: ${userMessage}`);
      
      // Send typing indicator
      await ctx.replyWithChatAction('typing');
      
      try {
        if (this.messageCallback) {
          // Generate a unique handler ID for this conversation
          const handlerId = this.generateHandlerId();
          
          // Create a response handler that will send the response to this specific chat
          this.responseHandlers.set(handlerId, async (response: BaseMessage) => {
            const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
            await ctx.telegram.sendMessage(chatId, content);
            console.log(`📤 Sent response to chat ${chatId}: ${content.substring(0, 100)}...`);
          });
          
          console.log(`🔗 Created response handler ${handlerId} for chat ${chatId}`);
          
          // Create a message with metadata for tracking
          const message = new HumanMessage(userMessage);
          
          // Store handler ID in message metadata for response routing
          (message as any).metadata = {
            chatId: chatId,
            userId: ctx.from?.id,
            username: ctx.from?.username,
            firstName: ctx.from?.first_name,
            lastName: ctx.from?.last_name,
            responseHandlerId: handlerId
          };
          
          await this.messageCallback(message);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        await ctx.reply('❌ Sorry, I encountered an error processing your request. Please try again.');
      }
    });

    // Handle errors
    this.bot.catch((err, ctx) => {
      console.error('Telegram bot error:', err);
      ctx.reply('❌ An error occurred. Please try again later.');
    });
  }
} 