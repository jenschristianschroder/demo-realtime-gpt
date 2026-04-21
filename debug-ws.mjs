import { AzureOpenAI } from "openai";
import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";

const endpoint = "https://jesch-mh9298oy-eastus2.cognitiveservices.azure.com/";
const deploymentName = "gpt-realtime-1.5";

const credential = new DefaultAzureCredential();
const scope = "https://cognitiveservices.azure.com/.default";
const azureADTokenProvider = getBearerTokenProvider(credential, scope);

const openAIClient = new AzureOpenAI({
    azureADTokenProvider,
    endpoint: endpoint,
    deployment: deploymentName,
    apiVersion: "2024-10-01-preview",
});

try {
  const { OpenAIRealtimeWS } = await import("openai/realtime/ws");
  const realtimeClient = await OpenAIRealtimeWS.azure(openAIClient);

  console.log("Waiting for connection properties...");
  
  // Every 500ms check if the socket is populated
  const interval = setInterval(() => {
    if (realtimeClient.socket) {
      console.log("=== Socket Detected ===");
      console.log("URL:", realtimeClient.socket.url);
      
      // If Using WS package, we can intercept the request
      if (realtimeClient.socket._req) {
         console.log("Headers:", JSON.stringify(realtimeClient.socket._req.getHeaders(), null, 2));
         clearInterval(interval);
         realtimeClient.close();
         process.exit(0);
      }
    }
  }, 100);

  // Fallback timeout
  setTimeout(() => {
    console.log("Timeout waiting for socket details.");
    realtimeClient.close();
    process.exit(1);
  }, 10000);

} catch (e) {
  console.error("Error:", e.message);
  process.exit(1);
}