import { Plugin, PluginConfig } from './Plugin';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';

export class SearchPlugin implements Plugin {
  public config: PluginConfig = {
    name: 'search',
    description: 'Plugin for searching the internet using Tavily',
    version: '1.0.0'
  };

  public tools: any[] = [
    new TavilySearchResults({ maxResults: 3 })
  ];

  public async initialize(): Promise<void> {
    // No initialization needed for Tavily search
  }

  public async cleanup(): Promise<void> {
    // No cleanup needed for Tavily search
  }
} 