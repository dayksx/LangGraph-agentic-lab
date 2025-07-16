# Telegram Client

The Telegram client allows your agentic platform to interact with users through Telegram bots. It implements the same `Client` interface as other clients and integrates seamlessly with the coordinator workflow.

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send the `/newbot` command
3. Follow the instructions to create your bot
4. Copy the bot token provided by BotFather

### 2. Configure Environment Variables

Add your bot token to your `.env` file:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 3. Run the Platform

The Telegram client will automatically be registered if the `TELEGRAM_BOT_TOKEN` environment variable is set.

```bash
# Development mode
npm run dev

# Production mode
npm run build && npm start

# Telegram-only example
npm run telegram:dev
```

## Features

### Commands

- `/start` - Welcome message and bot introduction
- `/help` - Show available commands and features
- `/status` - Check bot status and available agents

### Agent Routing

The bot automatically routes messages to the appropriate agent:

- **Oracle Agent**: General knowledge, research, and broad questions
- **Analyst Agent**: Financial analysis, startup evaluation, market research
- **Degen Agent**: Onchain operations, token transfers, blockchain interactions

### Message Handling

- Supports text messages
- Shows typing indicators during processing
- Handles errors gracefully
- Logs all interactions for debugging
- **Response Handlers**: Each conversation gets a unique response handler that captures the chat context
- **Concurrent Users**: Supports multiple users chatting simultaneously without conflicts
- **Telegraf Integration**: Leverages Telegraf's built-in context and API capabilities

## Usage Examples

Users can interact with your bot by sending messages like:

```
User: "What is artificial intelligence?"
Bot: [Oracle agent responds with AI explanation]

User: "Analyze this startup idea: A mobile app for pet owners"
Bot: [Analyst agent provides startup evaluation]

User: "How do I transfer ERC20 tokens?"
Bot: [Degen agent explains token transfer process]
```

## Customization

### Modifying Bot Responses

Edit the `setupBotHandlers()` method in `TelegramClient.ts` to customize:

- Welcome messages
- Help text
- Error messages
- Command responses

### Adding New Commands

```typescript
// Add a new command
this.bot.command('custom', (ctx) => {
  ctx.reply('This is a custom command!');
});
```

### Styling Messages

Telegram supports markdown formatting:

```typescript
ctx.reply('*Bold text* and _italic text_', { parse_mode: 'Markdown' });
```

## Error Handling

The client includes comprehensive error handling:

- Invalid bot tokens
- Network connectivity issues
- Message processing errors
- Graceful shutdown

## Security Considerations

- Never commit your bot token to version control
- Use environment variables for sensitive data
- Consider implementing user authentication if needed
- Monitor bot usage and implement rate limiting if necessary

## Troubleshooting

### Bot Not Responding

1. Check that `TELEGRAM_BOT_TOKEN` is set correctly
2. Verify the bot token is valid
3. Ensure the bot is not blocked by users
4. Check console logs for error messages

### Messages Not Being Processed

1. Verify the coordinator workflow is properly defined
2. Check that agents are registered correctly
3. Ensure plugins are working as expected
4. Review the message routing logic

### Performance Issues

1. Monitor response times
2. Consider implementing message queuing
3. Optimize agent processing
4. Use appropriate model configurations 