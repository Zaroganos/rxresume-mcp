import { config } from "dotenv";
import { createApiClient } from "./api-client.js";

// Load environment file (default: .env, or specify with ENV_FILE)
const envFile = process.env.ENV_FILE || ".env";
config({ path: envFile });
console.log(`Loading environment from: ${envFile}`);

const BASE_URL = process.env.RXRESUME_BASE_URL || "https://rxresu.me";
const API_KEY = process.env.RXRESUME_API_KEY;
const EMAIL = process.env.RXRESUME_EMAIL;
const PASSWORD = process.env.RXRESUME_PASSWORD;

async function main() {
  console.log(`Testing API connection to: ${BASE_URL}`);
  
  const client = createApiClient(BASE_URL);
  
  // Test health check
  try {
    const health = await client.healthCheck();
    console.log("✅ Health check passed:", health);
  } catch (error) {
    console.error("❌ Health check failed:", error);
    process.exit(1);
  }
  
  // Test authentication - prefer API key (v5 recommended)
  if (API_KEY) {
    try {
      console.log(`\nUsing API key authentication (v5)`);
      client.setApiKey(API_KEY);
      console.log("✅ API key set");
      
      // Test listing resumes
      const resumes = await client.listResumes();
      console.log(`✅ Found ${resumes.length} resumes`);
      
      if (resumes.length > 0) {
        const firstResume = resumes[0];
        console.log(`  First resume: "${firstResume.title}" (${firstResume.id})`);
        
        // Test getting full resume
        const fullResume = await client.getResume(firstResume.id);
        console.log(`✅ Retrieved full resume with ${Object.keys(fullResume.data.sections).length} sections`);
      }
    } catch (error) {
      console.error("❌ API key test failed:", error);
      process.exit(1);
    }
  } else if (EMAIL && PASSWORD) {
    // Fall back to email/password (legacy)
    try {
      console.log(`\nAttempting login as: ${EMAIL}`);
      const loginResult = await client.login(EMAIL, PASSWORD);
      console.log("✅ Login successful:", loginResult.user.name);
      
      // Test listing resumes
      const resumes = await client.listResumes();
      console.log(`✅ Found ${resumes.length} resumes`);
      
      if (resumes.length > 0) {
        const firstResume = resumes[0];
        console.log(`  First resume: "${firstResume.title}" (${firstResume.id})`);
        
        // Test getting full resume
        const fullResume = await client.getResume(firstResume.id);
        console.log(`✅ Retrieved full resume with ${Object.keys(fullResume.data.sections).length} sections`);
      }
    } catch (error) {
      console.error("❌ Authentication test failed:", error);
      process.exit(1);
    }
  } else {
    console.log("\n⚠️  No credentials provided. Skipping auth tests.");
    console.log("   Set RXRESUME_API_KEY (recommended) or RXRESUME_EMAIL + RXRESUME_PASSWORD");
  }
  
  console.log("\n✅ All tests passed!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
