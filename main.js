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
// import fs from "fs";
// import { parseStringPromise } from "js-yaml";

function parseYamlFile(filePath) {
  try {
    const yamlContent = fs.readFileSync(filePath, "utf8");
    return yaml.load(yamlContent); // Parse YAML into a JavaScript object
  } catch (error) {
    console.error("Error parsing YAML file:", error.message);
    throw error;
  }
}
const openApiDoc = parseYamlFile("./index.yaml");
let openApiDocStr = JSON.stringify(openApiDoc, null, 2);
openApiDocStr = openApiDocStr.replace(/{/g, "{{").replace(/}/g, "}}");

// const openApiDocStr = fs.readFileSync("./index.yaml", "utf8").replace(/{/g, "{{").replace(/}/g, "}}");


const runCurlTool = tool(
  async ({ curl }) => {
        console.log("Executing cURL Command:", curl); // Log the cURL command
    return new Promise((resolve, reject) => {
      exec(curl, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          console.error("Error executing cURL:", stderr || error.message);
          resolve(`Error: ${stderr || error.message}`);
        } else {
          console.log("cURL Success Output:", stdout);
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

const prompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a highly capable AI assistant that checks the OpenAPI documentation, extracts the required information, and generates valid cURL commands and executes them using run_curl tool.

  **Here is the OpenAPI specification:**
  yaml
/organizations:
    get:
      summary: List All Organizations
      description: This endpoint returns all Organizations accessible by the API key. For MTP admins, this could be the primary organization or all managed organizations depending on the API key's scope and if x-org-id is used.
      operationId: organizations_list_all
      tags:
        - Organizations
      parameters:
        - $ref: '#/parameters/trait:fields:fields'
        - $ref: '#/parameters/trait:filter:filter'
        - $ref: '#/parameters/trait:limit:limit'
        - $ref: '#/parameters/trait:skip:skip'
        - $ref: '#/parameters/trait:sort:sort'
        - $ref: '#/parameters/trait:multiTenantRequestHeaders:x-org-id'
      responses:
        '200':
          description: A list of organizations.
          schema:
            type: array
            items:
              $ref: '#/definitions/Organization'
      security:
        - x-api-key: []
    post:
      summary: create an organization
      description: This endpoint creates a new organization.
      tags:
        - Organizations
      parameters:
        - $ref: '#/parameters/trait:fields:fields'
        - $ref: '#/parameters/trait:filter:filter'
        - $ref: '#/parameters/trait:limit:limit'
        - $ref: '#/parameters/trait:skip:skip'
        - $ref: '#/parameters/trait:sort:sort'
        - $ref: '#/parameters/trait:multiTenantRequestHeaders:x-org-id'
      responses:
        '200':
          schema:
            type: array
            items:
              $ref: '#/definitions/Organization'
      security:
        - x-api-key: []
/systemusers:
    get:
        summary: List All System Users
        parameters:
            - $ref: '#/parameters/trait:fields:fields'
            - $ref: '#/parameters/trait:filter:filter'
            - $ref: '#/parameters/trait:limit:limit'
            - $ref: '#/parameters/trait:skip:skip'
            - $ref: '#/parameters/trait:sort:sort'
            - $ref: '#/parameters/trait:multiTenantRequestHeaders:x-org-id' #default is 
        security:
        - x-api-key: []



  **Your primary goal is to:**
  1. Parse the OpenAPI spec to understand the available endpoints, parameters, and required fields.
  2. Use the user's input to identify the correct endpoint and construct a valid cURL command.
  3. Ensure the cURL command includes:
     - The correct HTTP method (e.g., GET, POST, PUT).
     - The correct endpoint URL.
     - Required headers (e.g., 'x-api-key').
     - A valid JSON payload if needed (for POST/PUT requests).

  **DATA**
  Base URL: ${API_BASE_URL}
  API Key: ${API_KEY} (Add this to headers as 'x-api-key')
  Provider ID: ${PROVIDER_ID}

  **IMPORTANT:**
  1. Always validate the user's request against the OpenAPI spec.
  2. If the user asks for available endpoints, list them based on the OpenAPI spec.
  3. If the user's request is invalid or unclear, ask for clarification.
  4. Provide clear and concise responses.
  5. Use correct endpoints and parameters as per the OpenAPI spec. Do not make assumptions.`],
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