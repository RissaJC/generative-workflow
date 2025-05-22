import { AgentExecutor, createToolCallingAgent } from "langchain/agents"; // AgentExecutor is needed
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { tool } from "@langchain/core/tools";
import { ChatOllama } from "@langchain/ollama";
import { createReactAgent } from "@langchain/langgraph/prebuilt"; // Correct import for createReactAgent
import { ConversationSummaryMemory } from "langchain/memory"; // For memory (good for chaining)
import readline from "readline";
import { exec } from "child_process";
import fs from "fs";
import yaml from "js-yaml";
// Import your API client functions and Zod schemas
import { getSystemUsers, getAdminOrgnaizations, getOrganizations, createOrg, updateAdministrator, getPaginatedAdministrators, giveAdminAccessToOrg } from './axios.js';
import { GetPaginatedListSchema, CreateOrgScema, GetAdminOrganizations, AdministratorSchema, GiveAdminAccessToOrgSchema } from './schemas.js'; // Assuming you have GetPaginatedAdministratorsInputSchema now
import { isContext } from "vm";


const API_BASE_URL = 'https://console.wok-himanshu-gautam.dev-usw2-p02.jcplatform.dev/api';

const API_KEY = "jca_Yv5FQ16Ljo1Q5px172o9FSWxGDasL8VKXTeI" // It's recommended to keep sensitive information like API keys out of directly version-controlled code. Consider environment variables.
const PROVIDER_ID = "67f3aa3edc18a2ffa1060a36" // Similarly for provider ID.
// --- 1. Configure Ollama LLM ---
const ollama = new ChatOllama({
  baseUrl: "http://localhost:11434", // Ensure Ollama server is running
  model: "qwen2.5:7b", // Using your specified model
  temperature: 0.2, // Keep very low for deterministic tool use
  // format: 'json', // This might interfere with React Agent's output format, usually omitted for React agents
});

// --- 2. Define Custom Tools with EXPLICIT Descriptions and Schemas ---

// Tool for getting system users (GET /systemusers)
const usersListTool = tool(
  getSystemUsers,
  {
    name: "list_system_users", // Use snake_case for tool names (common convention for agents)
    description: `Retrieves a paginated list of system users and the total count of users. 
                  Accepts optional parameters: 'limit' (number, default 100), 
                  'skip' (number, default 0), 
                  'sort' (string, e.g., 'username' or '-email' for descending), 
                  'fields' (string, comma-separated), 
                  'filter' (array of strings, e.g., 'email:eq:user@example.com'), 
                  and 'search' (string).
                  This tool does NOT accept an ID directly. If you need a specific user's details by ID, 
                  you must first list users and then deduce the ID from the list, or use the 'get_paginated_administrator' tool.
                  **Crucial for finding an administrator's ID by email or name.**
                  Accepts optional parameters: 'limit' (number, default 10), 
                  'skip' (number, default 0), 
                  'filter' (array of strings, e.g., 'email:eq:lkj@gmail.com' or 'firstname:eq:John'),
                  and 'search' (string).
                  `,
    schema: GetPaginatedListSchema,
  }
);

const organizationsListTool = tool(
  getOrganizations,
  {
    name: "get_all_organizations", // Use snake_case for tool names (common convention for agents)
    description: `Retrieves all organizations and the total count of organizations. 
                  Accepts optional parameters: 'limit' (number, default 100), 
                  'skip' (number, default 0), 
                  This tool does NOT accept an ID directly. If you need a specific orgnaization's details by ID or displayName(name), 
                  you must first list organizations and then deduce the ID from the list.
                  if you find multiple results with the given criteria excute the task on all of them
                  `,
  }
);

const giveAdminAccessToOrgTool = tool(
  giveAdminAccessToOrg,
  {
    name: 'give_admin_access_to_organization',
    description: `gives admin access to organization by providing the admin id and the organization id`,
    schema: GiveAdminAccessToOrgSchema,
  }
)

// Tool for creating an organization (POST /providers/{provider_id}/organizations)
const createOrgTool = tool(
  createOrg, // Assuming this function takes { providerId: string, name: string, maxSystemUsers?: number }
  {
    name: "create_organization",
    description: `Creates a new organization under a given provider.
                  Requires 'name' (string).
                  Optionally accepts 'maxSystemUsers' (number).
                  returns the new organization created object including the id.
                  `,
    schema: CreateOrgScema, // Zod schema for organization creation input
  }
);

// Tool for updating an administrator (PUT /administrators/{id})
const updateAdministratorTool = tool(
  updateAdministrator, // Assuming this function takes { id: string, payload: AdministratorSchema }
  {
    name: "update_administrator_account",
    description: `Updates fields for an existing administrator account.
                  **If you don't have the administrator's ID, you must first use 'get_all_administrators' to find it.**
                  `,
    schema: AdministratorSchema, // Zod schema for administrator update input (will be the payload)
  }
);

const getAdministratorOrganizationsTool = tool(
  getAdminOrgnaizations, // Assuming this function takes { id: string, payload: AdministratorSchema }
  {
    name: "get_administrator_organizations",
    description: `gets the list of organizations that the administrator has access to`,
    schema: GetAdminOrganizations, // Zod schema for administrator update input (will be the payload)
  }
);

// Tool for getting a paginated list of administrators (GET /administrators)
// This is the key tool for getting an admin's ID
const getPaginatedAdminsTool = tool(
  getPaginatedAdministrators, // Assuming this function takes { limit?: number, skip?: number, filter?: string[], search?: string }
  {
    name: "get_paginated_administrators",
    description: `Retrieves a paginated list of administrator accounts.
                  **Crucial for finding an administrator's ID by email or name.**
                  Accepts optional parameters: 'limit' (number, default 10), 
                  'skip' (number, default 0), 
                  'filter' (array of strings, e.g., 'email:eq:lkj@gmail.com' or 'firstname:eq:John'),
                  and 'search' (string).
                  `,
    schema: GetPaginatedListSchema, // Zod schema for administrator list input
  }
);
const runCurlTool = tool(
  async ({ curl }) => {
        console.log("Executing cURL Command:", curl); // Log the cURL command
    return new Promise((resolve, reject) => {
      exec(curl, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          resolve(`Error: ${stderr || error.message}`);
        } else {
          resolve(stdout);
        }
      });
    });
  },
  {
    name: "run_curl",
    description: "Executes a cURL command and returns the output. Input must be a valid cURL command as a string in the 'curl' property.",
    schema: {
      type: "object",
      properties: {
        curl: { type: "string", description: "The cURL command to execute" }
      },
      required: ["curl"]
    }
  }
);

// --- Define all tools available to the agent ---
// const tools = [usersListTool, createOrgTool, updateAdministratorTool, getPaginatedAdminsTool, organizationsListTool, getAdministratorOrganizationsTool, giveAdminAccessToOrgTool];
const tools = [runCurlTool];

// --- 3. Initialize Agent with Memory and Prompt ---
async function initializeAndRun() {
  // Setup memory for conversational context
  const memory = new ConversationSummaryMemory({
    memoryKey: "chat_history", // This will hold the conversation history
    inputKey: "input", // The key for the input to the agent
    outputKey: "output", // The key for the agent's final response
    returnMessages: true, // Store messages as Message objects
    llm: ollama, // Pass the LLM to the memory for summarization if needed
  });

  const getToolsTextDescription = (tools) => {
  return tools.map(tool => `Tool Name: ${tool.name}\nDescription: ${tool.description}\nSchema: ${tool.schema}`).join('\n\n');
};

const toolsTextDescription = getToolsTextDescription(tools);
  // The custom prompt template for the React agent.
  // It's vital that this structure matches the React agent's expected format.
  // The placeholders {tools}, {tool_names}, {chat_history}, {input}, {agent_scratchpad}
  // are automatically filled by LangChain based on the agent type.
  // const prompt = ChatPromptTemplate.fromMessages([
  // ["system", `You are a highly capable AI assistant that uses available tools to fulfill user requests.
    
  //   Current Date and Time: ${new Date().toLocaleString()} (EEST, Lebanon)

  //   **Your primary goal is to achieve the user's request by calling tools sequentially.**
  //   **IMPORTANT:**
  //   1.  If an action requires an ID that you don't have, your first step MUST be to use a 'GET' tool (e.g., 'get_paginated_administrators') to retrieve that ID.
  //   2.  **NEVER** try to call an 'UPDATE' or 'DELETE' tool with a placeholder like '<administrator_id>'. You must obtain the actual ID from a previous 'GET' tool's 'Observation'.
  //   3.  **Carefully read the JSON 'Observation' returned by 'GET' tools to extract the necessary ID.**
  //   4.  Then, use the **extracted actual ID** with the appropriate action tool (e.g., 'update_administrator_account').
  //   5.  After successfully completing all required actions, provide a clear and concise 'Final Answer' summarizing the outcome.
  //   6. always wait for a tool resonse before calling the next one.
  //   `],
  // new MessagesPlaceholder("chat_history"), // Past messages from memory
  // ["human", "{input}"], // Current user input
  // new MessagesPlaceholder("agent_scratchpad")
  // ]);
const openApiDocStr = fs.readFileSync("./index.yaml", "utf8").replace(/{/g, "{{").replace(/}/g, "}}");

function preprocessOpenApiSpec(filePath) {
  const fileContent = fs.readFileSync("./index.yaml", "utf8").replace(/{/g, "{{").replace(/}/g, "}}");
  const openApiDoc = yaml.load(fileContent);

  // Extract key details (e.g., endpoints and methods)
  const endpoints = Object.keys(openApiDoc.paths).map(path => {
    const methods = Object.keys(openApiDoc.paths[path]);
    return { path, methods };
  });

  // console.log("Context Passed to AI:", { endpoints });
  return endpoints;
}
// console.log("OpenAPI Doc String:", openApiDocStr); // Log the OpenAPI doc string for debugging
const openApiEndpoints = preprocessOpenApiSpec("./index.yaml");
const prompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a highly capable AI assistant that checks the API docs, gather the required information from user
    creates the accurately formatted cURL and uses the tool to run the cURL and show the response to the user.

  Here is the list of available endpoints from the OpenAPI specification:`+ JSON.stringify(openApiDocStr) +`

  **Your primary goal is to achieve the user's request by referencing the OpenAPI spec.**
  **DATA**
  Base URL: ${API_BASE_URL}
  API Key: ${API_KEY} Add this to headers as 'x-api-key'
  Provider ID: ${PROVIDER_ID} 
  **IMPORTANT:**
  1. Use the OpenAPI spec to understand endpoints, parameters, and required fields.
  2. If the user asks for available endpoints, list them based on the OpenAPI spec.
  3. Provide clear and concise responses.`],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad")
]);


  // Create the React agent
  const app = createToolCallingAgent({
    llm: ollama, // The LLM with tools
    tools, // The tools the agent can use
    prompt, // The custom prompt template
    // agentArgs: { // No need for agentArgs if prompt is direct here
    //    prefix: "..." // Example prefix for the agent's response
    // }
  });

  // Initialize the AgentExecutor
  const agentExecutor = new AgentExecutor({
    agent: app, // The created React agent
    tools: tools, // The tools the agent can use
    verbose: false, // Crucial for debugging the agent's thought process
    memory: memory, // Attach the memory to the executor
  });

  // console.log("\n--- Agent Initialized. Ready for queries ---");
  // console.log("Make sure your mock API server (mockApi.js) is running on http://localhost:3000\n");
  // console.log("Ensure your JumpCloud API Key and Org ID are set in .env if needed by axios.js\n");


  // --- Example Workflow Prompts ---

  // Scenario 1: Suspend an administrator account by email (requires chaining)
  // const result = await agentExecutor.invoke({ input: "are you able to read the open API doc?" });
  // console.log("Result:", result.output);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  while (true) {
    const userInput = await new Promise(resolve => rl.question("You: ", resolve)); // Prompt user for input
    if (userInput.trim().toLowerCase() === "exit") {
      console.log("Goodbye!");
      rl.close();
      break;
    }

    try {
      const result = await agentExecutor.invoke({ input: userInput }); // Pass user input to the agent
      console.log("AI:", result.output); // Print the AI's response
    } catch (error) {
      console.error("Error:", error.message); // Handle errors gracefully
    }
  }

  // // Scenario 2: Create an Org (single step)
  // await agentExecutor.invoke({
  //   input: "Create a new organization called 'My New Test Org' for provider 'some-provider-id'.",
  // });

  // // Scenario 3: List system users (single step)
  // await agentExecutor.invoke({
  //   input: "List all system users.",
  // });

  // // Scenario 4: Update administrator first name (requires fetching ID first)
  // await agentExecutor.invoke({
  //     input: "Change the first name of the administrator with email 'lkj@gmail.com' to 'Luke'.",
  // });
}

initializeAndRun();
// const curl = `curl -X POST \
//   https://console.wok-himanshu-gautam.dev-usw2-p02.jcplatform.dev/api/organizations \
//   -H 'Content-Type: application/json' \
//   -H 'x-api-key: jca_Yv5FQ16Ljo1Q5px172o9FSWxGDasL8VKXTeI' \
//   -d '{"name": "TestOrg", "maxSystemUsers": 10, "providerId": "67f3aa3edc18a2ffa1060a36"}'`;
// console.log(runCurlTool.func({curl}));