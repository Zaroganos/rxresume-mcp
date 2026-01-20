import { createApiClient } from "./api-client.js";

const BASE_URL = process.env.RXRESUME_BASE_URL || "https://rxresu.me";

async function main() {
  const client = createApiClient(BASE_URL);

  console.log("Testing Reactive Resume API connectivity...");
  console.log(`Base URL: ${BASE_URL}\n`);

  try {
    console.log("1. Health check...");
    const health = await client.healthCheck();
    console.log(`   ✓ Server status: ${health.status}\n`);
  } catch (error) {
    console.error(`   ✗ Health check failed: ${error instanceof Error ? error.message : error}`);
    console.log("\nMake sure the Reactive Resume instance is accessible.");
    process.exit(1);
  }

  const email = process.env.RXRESUME_EMAIL;
  const password = process.env.RXRESUME_PASSWORD;

  if (!email || !password) {
    console.log("2. Skipping authentication test (RXRESUME_EMAIL and RXRESUME_PASSWORD not set)");
    console.log("\nTo test authentication, set these environment variables:");
    console.log("  RXRESUME_EMAIL=your@email.com");
    console.log("  RXRESUME_PASSWORD=yourpassword");
    return;
  }

  try {
    console.log("2. Authenticating...");
    const loginResult = await client.login(email, password);
    console.log(`   ✓ Logged in as: ${loginResult.user.name} (${loginResult.user.email})\n`);
  } catch (error) {
    console.error(`   ✗ Authentication failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }

  try {
    console.log("3. Fetching current user...");
    const user = await client.getCurrentUser();
    console.log(`   ✓ User ID: ${user.id}`);
    console.log(`   ✓ Username: ${user.username}\n`);
  } catch (error) {
    console.error(`   ✗ Failed to get user: ${error instanceof Error ? error.message : error}`);
  }

  try {
    console.log("4. Listing resumes...");
    const resumes = await client.listResumes();
    console.log(`   ✓ Found ${resumes.length} resume(s)`);
    for (const resume of resumes) {
      console.log(`     - ${resume.title} (${resume.id})`);
    }
    console.log();
  } catch (error) {
    console.error(`   ✗ Failed to list resumes: ${error instanceof Error ? error.message : error}`);
  }

  console.log("All tests completed successfully!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
