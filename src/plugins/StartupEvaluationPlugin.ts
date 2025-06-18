import { Plugin, PluginConfig } from './Plugin';
import { DynamicTool } from '@langchain/core/tools';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { AIMessage, HumanMessage } from '@langchain/core/messages';

// Define evaluation criteria
const EVALUATION_CRITERIA = {
    marketPotential: {
        description: "Market size, growth potential, and competitive landscape",
        weight: 0.25
    },
    team: {
        description: "Founder experience, team composition, and execution capability",
        weight: 0.20
    },
    technology: {
        description: "Technical innovation, scalability, and intellectual property",
        weight: 0.20
    },
    businessModel: {
        description: "Revenue model, pricing strategy, and unit economics",
        weight: 0.20
    },
    traction: {
        description: "Current progress, user adoption, and key metrics",
        weight: 0.15
    }
};

export class StartupEvaluationPlugin implements Plugin {
    private llm: ChatOpenAI;
    private evaluationChain: any;
    private reflectionChain: any;
    private parsingChain: any;

    public config: PluginConfig = {
        name: 'startup_evaluation',
        description: 'Plugin for evaluating startup projects using AI reflection',
        version: '1.0.0'
    };

    constructor() {
        // Initialize LLM
        this.llm = new ChatOpenAI({
            modelName: "gpt-4o-mini",
            temperature: 0,
        });

        // Create parsing prompt
        const parsingPrompt = ChatPromptTemplate.fromMessages([
            ["system", `You are an expert at analyzing startup descriptions and extracting structured information.
                Extract relevant information from the provided startup description and organize it into the following categories:
                - Market Potential: market size, growth potential, competition
                - Team: founder experience, team composition, execution capability
                - Technology: technical stack, innovation, intellectual property
                - Business Model: revenue model, pricing, unit economics
                - Traction: current progress, user adoption, key metrics
                Return ONLY a raw JSON object with these categories as keys. Do not include any markdown formatting, code blocks, or additional text.
                Include only the information that is explicitly mentioned in the text.`
            ],
            new MessagesPlaceholder("messages"),
        ]);

        // Create evaluation prompt
        const evaluationPrompt = ChatPromptTemplate.fromMessages([
            ["system", `You are an expert startup evaluator. Analyze the provided startup project based on the following criteria:
                ${Object.entries(EVALUATION_CRITERIA).map(([key, value]) => `- ${key}: ${value.description} (Weight: ${value.weight * 100}%)`).join('\n')}
                Provide a detailed analysis for each criterion and an overall score out of 100.`
            ],
            new MessagesPlaceholder("messages"),
        ]);

        // Create reflection prompt
        const reflectionPrompt = ChatPromptTemplate.fromMessages([
            ["system", `You are a startup evaluation expert reviewing an analysis. Provide detailed feedback on:
                1. Accuracy of the analysis
                2. Areas that need more depth
                3. Potential biases or blind spots
                4. Suggestions for improvement
                5. Overall quality of the evaluation`],
            new MessagesPlaceholder("messages"),
        ]);

        this.parsingChain = parsingPrompt.pipe(this.llm);
        this.evaluationChain = evaluationPrompt.pipe(this.llm);
        this.reflectionChain = reflectionPrompt.pipe(this.llm);
    }

    public tools: DynamicTool[] = [
        new DynamicTool({
            name: "evaluate_startup",
            description: "Evaluate a startup project based on multiple criteria. Input should be a text description of the startup project.",
            func: async (input: string) => {
                try {
                    // Parse the free text input into structured data
                    const parsedData = await this.parsingChain.invoke({
                        messages: [new HumanMessage({ content: input })]
                    });

                    // Parse the JSON string from the LLM response
                    const projectDetails = JSON.parse(parsedData.content);

                    // Generate initial evaluation
                    const evaluation = await this.evaluationChain.invoke({
                        messages: [new HumanMessage({ content: JSON.stringify(projectDetails, null, 2) })]
                    });

                    // Get reflection on the evaluation
                    const reflection = await this.reflectionChain.invoke({
                        messages: [
                            new HumanMessage({ content: JSON.stringify(projectDetails, null, 2) }),
                            new AIMessage({ content: evaluation.content })
                        ]
                    });

                    // Generate final evaluation incorporating reflection
                    const finalEvaluation = await this.evaluationChain.invoke({
                        messages: [
                            new HumanMessage({ content: JSON.stringify(projectDetails, null, 2) }),
                            new AIMessage({ content: evaluation.content }),
                            new AIMessage({ content: reflection.content })
                        ]
                    });

                    return `Parsed Information:\n${JSON.stringify(projectDetails, null, 2)}\n\nInitial Evaluation:\n${evaluation.content}\n\nReflection:\n${reflection.content}\n\nFinal Evaluation:\n${finalEvaluation.content}`;
                } catch (error: any) {
                    console.log("> error: ", error);
                    return `Error evaluating startup: ${error.message}`;
                }
            }
        })
    ];

    public async initialize(): Promise<void> {
        // No initialization needed
    }

    public async cleanup(): Promise<void> {
        // No cleanup needed
    }
} 