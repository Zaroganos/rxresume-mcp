import { config } from "dotenv";
import { createApiClient } from "./api-client.js";

config({ path: ".env.zimerguz" });

const client = createApiClient(process.env.RXRESUME_BASE_URL!);
client.setApiKey(process.env.RXRESUME_API_KEY!);

async function main() {
  console.log("=== COMPREHENSIVE API TEST ===\n");
  
  let resumeId: string | null = null;
  let experienceId: string | null = null;
  let educationId: string | null = null;
  let skillId: string | null = null;
  let projectId: string | null = null;
  
  try {
    // 1. Create resume
    console.log("1. Creating test resume...");
    const resume = await client.createResume({
      title: "MCP Comprehensive Test",
      slug: `mcp-test-${Date.now()}`,
    });
    resumeId = resume.id;
    console.log(`   ✅ Created: ${resume.id} - "${resume.title}"`);
    
    // 2. Get resume
    console.log("\n2. Getting resume...");
    const fetched = await client.getResume(resumeId);
    console.log(`   ✅ Fetched: "${fetched.title}" with ${Object.keys(fetched.data.sections).length} sections`);
    
    // 3. Update basics
    console.log("\n3. Updating basics...");
    const updated = await client.updateBasics(resumeId, {
      name: "Test User",
      headline: "Software Engineer",
      email: "test@example.com",
      phone: "555-1234",
      location: "New York, NY",
    });
    console.log(`   ✅ Updated basics: ${updated.data.basics.name}`);
    
    // 4. Update summary (skipped - uses complex v5 schema)
    console.log("\n4. Skipping summary update (complex v5 schema)");
    
    // 5. Add experience (v5 schema: hidden, period, website, description)
    console.log("\n5. Adding experience...");
    experienceId = `exp-${Date.now()}`;
    const withExp = await client.addSectionItem(resumeId, "experience", {
      id: experienceId,
      company: "Test Company",
      position: "Senior Engineer",
      period: "2020 - Present",
      location: "Remote",
      description: "<p>Led development of key features.</p>",
      hidden: false,
      website: { url: "", label: "" },
    });
    console.log(`   ✅ Added experience: ${experienceId}`);
    
    // 6. Add education (v5 schema: school, degree, grade, period, website, description)
    console.log("\n6. Adding education...");
    educationId = `edu-${Date.now()}`;
    const withEdu = await client.addSectionItem(resumeId, "education", {
      id: educationId,
      school: "Test University",
      degree: "Bachelor of Science",
      area: "Computer Science",
      period: "2012 - 2016",
      grade: "3.8 GPA",
      location: "",
      description: "",
      hidden: false,
      website: { url: "", label: "" },
    });
    console.log(`   ✅ Added education: ${educationId}`);
    
    // 7. Add skill (v5 schema: icon, proficiency, level, keywords)
    console.log("\n7. Adding skill...");
    skillId = `skill-${Date.now()}`;
    const withSkill = await client.addSectionItem(resumeId, "skills", {
      id: skillId,
      icon: "",
      name: "Programming",
      proficiency: "Expert",
      keywords: ["TypeScript", "JavaScript", "Python"],
      level: 4,
      hidden: false,
    });
    console.log(`   ✅ Added skill: ${skillId}`);
    
    // 8. Add project (v5 schema: period, website, description)
    console.log("\n8. Adding project...");
    projectId = `proj-${Date.now()}`;
    const withProj = await client.addSectionItem(resumeId, "projects", {
      id: projectId,
      name: "Test Project",
      period: "2023",
      description: "<p>Built an amazing thing.</p>",
      hidden: false,
      website: { url: "https://example.com", label: "View Project" },
    });
    console.log(`   ✅ Added project: ${projectId}`);
    
    // 9. Update section item
    console.log("\n9. Updating experience item...");
    await client.updateSectionItem(resumeId, "experience", experienceId, {
      position: "Staff Engineer",
    } as any);
    console.log(`   ✅ Updated experience position`);
    
    // 10. Get section
    console.log("\n10. Getting experience section...");
    const resumeWithSections = await client.getResume(resumeId);
    const expSection = resumeWithSections.data.sections.experience;
    console.log(`   ✅ Experience section has ${(expSection as any).items?.length || 0} items`);
    
    // 11. Update visibility
    console.log("\n11. Updating resume visibility...");
    const publicResume = await client.updateResume(resumeId, { visibility: "public" });
    console.log(`   ✅ Updated visibility to: ${publicResume.visibility}`);
    
    // 12. Remove section items
    console.log("\n12. Removing section items...");
    await client.removeSectionItem(resumeId, "projects", projectId);
    console.log(`   ✅ Removed project`);
    await client.removeSectionItem(resumeId, "skills", skillId);
    console.log(`   ✅ Removed skill`);
    await client.removeSectionItem(resumeId, "education", educationId);
    console.log(`   ✅ Removed education`);
    await client.removeSectionItem(resumeId, "experience", experienceId);
    console.log(`   ✅ Removed experience`);
    
    // 13. Delete resume
    console.log("\n13. Deleting test resume...");
    await client.deleteResume(resumeId);
    console.log(`   ✅ Deleted resume`);
    
    console.log("\n=== ALL TESTS PASSED ===");
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    
    // Cleanup on failure
    if (resumeId) {
      try {
        console.log("\nCleaning up...");
        await client.deleteResume(resumeId);
        console.log("   Deleted test resume");
      } catch {}
    }
    process.exit(1);
  }
}

main();
