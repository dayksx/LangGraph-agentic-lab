import { Client, ClientConfig } from './Client';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import * as readline from 'readline';

export class TerminalClient implements Client {
  public config: ClientConfig = {
    name: 'terminal',
    type: 'terminal',
    enabled: true
  };

  private rl: readline.Interface;
  private messageCallback: ((message: BaseMessage) => Promise<void>) | null = null;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  public async initialize(): Promise<void> {
    // No initialization needed
  }

  public async start(): Promise<void> {
    console.log('Terminal client started. Type your messages (type "exit" to quit):');
    this.startListening();
  }

  public async stop(): Promise<void> {
    this.rl.close();
  }

  public async sendMessage(message: BaseMessage): Promise<void> {
    console.log('\nAgent:', message.content);
  }

  public onMessage(callback: (message: BaseMessage) => Promise<void>): void {
    this.messageCallback = callback;
  }

  private startListening(): void {
    this.rl.question('\nYou: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        await this.stop();
        process.exit(0);
      }

      if (this.messageCallback) {
        await this.messageCallback(new HumanMessage(input));
      }

      this.startListening();
    });
  }
} 