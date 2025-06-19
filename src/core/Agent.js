"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
var openai_1 = require("@langchain/openai");
var langgraph_1 = require("@langchain/langgraph");
var prebuilt_1 = require("@langchain/langgraph/prebuilt");
var Agent = /** @class */ (function () {
    function Agent(config) {
        this.tools = config.tools;
        this.modelConfig = {
            modelName: config.modelName,
            temperature: config.temperature,
        };
        // Initialize model with initial tools
        this.initializeModel();
        this.workflow = this.createWorkflow();
    }
    Agent.prototype.initializeModel = function () {
        this.model = new openai_1.ChatOpenAI({
            model: this.modelConfig.modelName,
            temperature: this.modelConfig.temperature,
        }).bindTools(this.tools);
    };
    Agent.prototype.addTools = function (newTools) {
        this.tools = __spreadArray(__spreadArray([], this.tools, true), newTools, true);
        // Reinitialize model with all tools
        this.initializeModel();
        // Recreate workflow with new tools
        this.workflow = this.createWorkflow();
    };
    Agent.prototype.createWorkflow = function () {
        var _this = this;
        // Create the workflow with Zod schema
        var workflow = new langgraph_1.StateGraph(langgraph_1.MessagesAnnotation);
        var toolNode = new prebuilt_1.ToolNode(this.tools);
        // Define the function that calls the model
        var callModel = function (state) { return __awaiter(_this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.model.invoke(state.messages)];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, { messages: [response] }];
                }
            });
        }); };
        // Define the router function
        var shouldContinue = function (state) {
            var _a;
            var lastMessage = state.messages[state.messages.length - 1];
            if ((_a = lastMessage.tool_calls) === null || _a === void 0 ? void 0 : _a.length) {
                return "tools";
            }
            return "__end__";
        };
        // Add nodes and edges
        workflow
            .addNode("agent", callModel)
            .addEdge("__start__", "agent")
            .addNode("tools", toolNode)
            .addEdge("tools", "agent")
            .addConditionalEdges("agent", shouldContinue);
        return workflow;
    };
    Agent.prototype.processMessage = function (messages) {
        return __awaiter(this, void 0, void 0, function () {
            var app, finalState;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        app = this.workflow.compile();
                        return [4 /*yield*/, app.invoke({ messages: messages })];
                    case 1:
                        finalState = _a.sent();
                        return [2 /*return*/, finalState.messages[finalState.messages.length - 1]];
                }
            });
        });
    };
    return Agent;
}());
exports.Agent = Agent;
