import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { tool } from "@langchain/core/tools";
import { getSystemUsers, createOrg } from './axios.js'
import { GetSystemUsersInputSchema, CreateOrgScema } from './schemas.js'
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOllama } from "@langchain/ollama";

const ollama = new ChatOllama({
  model: "qwen2.5:7b", // Or "qwen:3b", "phi:phi-2", etc.  Match the model you pulled
  format: 'json', // Add this line
});


async function initializeAndRun() {
  const prompt = ChatPromptTemplate.fromMessages([
  // System message provides initial instructions and context to the LLM
  ["system", `You are an AI assistant that can generate a sequence of API calls to achieve a user's goal.use only the tools available.`],
  
  // This placeholder is crucial for the ConversationBufferMemory.
  // LangChain will inject the historical "human" and "ai" messages here.
//   new MessagesPlaceholder("chat_history"),
["placeholder", "{chat_history}"],
  
  // User message for the current turn.
  // The "{input}" variable will be filled with the user's current query.
  ["human", "{input}"], 
  
  // This placeholder is where the agent's internal "scratchpad" goes.
  // LangChain injects the LLM's thoughts, tool calls, and tool observations here.
  // It's conceptually the agent's internal monologue and tool interactions.
  new MessagesPlaceholder("agent_scratchpad"),
]);


const usersListTool = tool(
  getSystemUsers,
  {
    name: "users list",
    description: "return a list of paginated users with total count",
    schema: GetSystemUsersInputSchema,
  }
);

const createOrgTool = tool(
  createOrg,
  {
    name: "create_org",
    description: "creates a organization",
    schema: CreateOrgScema,
  }
);
  const tools = [usersListTool, createOrgTool]

  const app = createReactAgent({
    llm: ollama,
    tools,
  });


  const result = await app.invoke({
  messages: [
    {
      role: "user",
      content: "create a new organization named helloorg then list all my users",
    },
  ],
});
  console.log(result);
}

initializeAndRun();