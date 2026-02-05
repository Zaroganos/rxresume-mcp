#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { RxResumeApiClient, createApiClient } from "./api-client.js";
import type {
  ExperienceItem,
  EducationItem,
  SkillItem,
  ProjectItem,
  SectionName,
} from "./types.js";

const BASE_URL = process.env.RXRESUME_BASE_URL || "https://rxresu.me";
const API_KEY = process.env.RXRESUME_API_KEY || "";

let apiClient: RxResumeApiClient = createApiClient(BASE_URL);

// Auto-configure API key from environment if available
if (API_KEY) {
  apiClient.setApiKey(API_KEY);
}

// Generate cuid2-compatible IDs (lowercase alphanumeric, ~24 chars)
function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const length = 24;
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

const server = new McpServer({
  name: "rxresume-mcp",
  version: "1.0.0",
});

server.tool(
  "authenticate",
  "Authenticate with Reactive Resume using an API key (recommended for v5) or email/password. API keys can be created in Settings > API Keys in the Reactive Resume dashboard.",
  {
    api_key: z.string().optional().describe("API key (recommended for v5 - create in Settings > API Keys)"),
    identifier: z.string().optional().describe("Username or email address (legacy auth)"),
    password: z.string().optional().describe("User password (legacy auth)"),
  },
  async ({ api_key, identifier, password }) => {
    try {
      // Prefer API key authentication (v5)
      if (api_key) {
        apiClient.setApiKey(api_key);
        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully authenticated with API key`,
            },
          ],
        };
      }
      
      // Fall back to email/password login (legacy)
      if (identifier && password) {
        const result = await apiClient.login(identifier, password);
        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully authenticated as ${result.user.name} (${result.user.email})`,
            },
          ],
        };
      }
      
      return {
        content: [
          {
            type: "text" as const,
            text: `Please provide either an api_key or both identifier and password`,
          },
        ],
        isError: true,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "set_base_url",
  "Change the Reactive Resume instance URL",
  {
    url: z.string().url().describe("Base URL of the Reactive Resume instance"),
  },
  async ({ url }) => {
    apiClient = createApiClient(url);
    return {
      content: [
        {
          type: "text" as const,
          text: `Base URL changed to: ${url}`,
        },
      ],
    };
  }
);

server.tool(
  "check_connection",
  "Check if the Reactive Resume instance is accessible",
  {},
  async () => {
    try {
      const health = await apiClient.healthCheck();
      return {
        content: [
          {
            type: "text" as const,
            text: `Connection successful. Server status: ${health.status}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_current_user",
  "Get information about the currently authenticated user",
  {},
  async () => {
    try {
      const user = await apiClient.getCurrentUser();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(user, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to get user: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "list_resumes",
  "List all resumes for the authenticated user",
  {},
  async () => {
    try {
      const resumes = await apiClient.listResumes();
      if (resumes.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No resumes found. Create one using the create_resume tool.",
            },
          ],
        };
      }
      const formatted = resumes.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        visibility: r.visibility,
        locked: r.locked,
        updatedAt: r.updatedAt,
      }));
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(formatted, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to list resumes: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_resume",
  "Get full details of a specific resume by ID",
  {
    resume_id: z.string().describe("The resume ID"),
  },
  async ({ resume_id }) => {
    try {
      const resume = await apiClient.getResume(resume_id);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(resume, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to get resume: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_resume_section",
  "Get a specific section from a resume",
  {
    resume_id: z.string().describe("The resume ID"),
    section: z
      .enum([
        "basics",
        "summary",
        "experience",
        "education",
        "skills",
        "projects",
        "certifications",
        "languages",
        "awards",
        "publications",
        "volunteer",
        "interests",
        "references",
        "profiles",
      ])
      .describe("Section name to retrieve"),
  },
  async ({ resume_id, section }) => {
    try {
      const resume = await apiClient.getResume(resume_id);
      let data: unknown;
      if (section === "basics") {
        data = resume.data.basics;
      } else {
        data = resume.data.sections[section as SectionName];
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to get section: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "create_resume",
  "Create a new resume",
  {
    title: z.string().describe("Resume title"),
    slug: z
      .string()
      .optional()
      .describe("URL-friendly slug (auto-generated if not provided)"),
    visibility: z
      .enum(["private", "public"])
      .optional()
      .default("private")
      .describe("Resume visibility"),
  },
  async ({ title, slug, visibility }) => {
    try {
      const resume = await apiClient.createResume({
        title,
        slug: slug || title.toLowerCase().replace(/\s+/g, "-"),
        visibility,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: `Resume created successfully!\nID: ${resume.id}\nTitle: ${resume.title}\nSlug: ${resume.slug}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to create resume: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "update_resume_basics",
  "Update basic information (name, headline, email, phone, location, URL)",
  {
    resume_id: z.string().describe("The resume ID"),
    name: z.string().optional().describe("Full name"),
    headline: z.string().optional().describe("Professional headline/title"),
    email: z.string().email().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number"),
    location: z.string().optional().describe("Location/Address"),
    url_label: z.string().optional().describe("Website label"),
    url_href: z.string().url().optional().describe("Website URL"),
  },
  async ({ resume_id, name, headline, email, phone, location, url_label, url_href }) => {
    try {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (headline !== undefined) updates.headline = headline;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (location !== undefined) updates.location = location;
      if (url_label !== undefined || url_href !== undefined) {
        const resume = await apiClient.getResume(resume_id);
        updates.url = {
          label: url_label ?? resume.data.basics.url.label,
          href: url_href ?? resume.data.basics.url.href,
        };
      }

      await apiClient.updateBasics(resume_id, updates);
      return {
        content: [
          {
            type: "text" as const,
            text: "Basic information updated successfully.",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to update basics: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "update_summary",
  "Update the professional summary section",
  {
    resume_id: z.string().describe("The resume ID"),
    content: z.string().describe("The summary content (supports HTML/Markdown)"),
  },
  async ({ resume_id, content: summaryContent }) => {
    try {
      const resume = await apiClient.getResume(resume_id);
      const summarySection = resume.data.sections.summary;
      const updatedSection = {
        ...summarySection,
        content: summaryContent,
      };
      await apiClient.updateSection(resume_id, "summary", updatedSection);
      return {
        content: [
          {
            type: "text" as const,
            text: "Summary updated successfully.",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to update summary: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "add_experience",
  "Add a work experience entry",
  {
    resume_id: z.string().describe("The resume ID"),
    company: z.string().describe("Company name"),
    position: z.string().describe("Job title/position"),
    location: z.string().optional().default("").describe("Job location"),
    date: z.string().optional().default("").describe("Date range (e.g., 'Jan 2020 - Present')"),
    summary: z.string().optional().default("").describe("Description of responsibilities and achievements (supports HTML)"),
    url: z.string().url().optional().describe("Company website URL"),
  },
  async ({ resume_id, company, position, location, date, summary, url }) => {
    try {
      // v5 uses: hidden, period, website, description
      const item = {
        id: generateId(),
        hidden: false,
        company,
        position,
        location: location || "",
        period: date || "",
        description: summary || "",
        website: {
          label: "",
          url: url || "",
        },
      };
      await apiClient.addSectionItem(resume_id, "experience", item);
      return {
        content: [
          {
            type: "text" as const,
            text: `Experience added: ${position} at ${company}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to add experience: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "add_education",
  "Add an education entry",
  {
    resume_id: z.string().describe("The resume ID"),
    institution: z.string().describe("School/University name"),
    study_type: z.string().describe("Degree type (e.g., 'Bachelor of Science')"),
    area: z.string().describe("Field of study"),
    score: z.string().optional().default("").describe("GPA or grade"),
    date: z.string().optional().default("").describe("Date range"),
    summary: z.string().optional().default("").describe("Additional details"),
    url: z.string().url().optional().describe("Institution website"),
  },
  async ({ resume_id, institution, study_type, area, score, date, summary, url }) => {
    try {
      // v5 uses: school, degree, grade, period, website, description, location
      const item = {
        id: generateId(),
        hidden: false,
        school: institution,
        degree: study_type,
        area,
        grade: score || "",
        location: "",
        period: date || "",
        description: summary || "",
        website: {
          label: "",
          url: url || "",
        },
      };
      await apiClient.addSectionItem(resume_id, "education", item);
      return {
        content: [
          {
            type: "text" as const,
            text: `Education added: ${study_type} in ${area} at ${institution}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to add education: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "add_skill",
  "Add a skill entry",
  {
    resume_id: z.string().describe("The resume ID"),
    name: z.string().describe("Skill name or category"),
    description: z.string().optional().default("").describe("Skill description"),
    level: z.number().min(0).max(5).optional().default(3).describe("Proficiency level (0-5)"),
    keywords: z.array(z.string()).optional().default([]).describe("Related keywords/technologies"),
  },
  async ({ resume_id, name, description, level, keywords }) => {
    try {
      // v5 uses: hidden, icon, proficiency, level, keywords
      const item = {
        id: generateId(),
        hidden: false,
        icon: "",
        name,
        proficiency: description || "",
        level: level ?? 3,
        keywords: keywords || [],
      };
      await apiClient.addSectionItem(resume_id, "skills", item);
      return {
        content: [
          {
            type: "text" as const,
            text: `Skill added: ${name}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to add skill: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "add_project",
  "Add a project entry",
  {
    resume_id: z.string().describe("The resume ID"),
    name: z.string().describe("Project name"),
    description: z.string().optional().default("").describe("Brief description"),
    date: z.string().optional().default("").describe("Project date/duration"),
    summary: z.string().optional().default("").describe("Detailed summary (supports HTML)"),
    keywords: z.array(z.string()).optional().default([]).describe("Technologies/keywords"),
    url: z.string().url().optional().describe("Project URL"),
  },
  async ({ resume_id, name, description, date, summary, keywords, url }) => {
    try {
      // v5 uses: hidden, period, website, description (no keywords)
      const item = {
        id: generateId(),
        hidden: false,
        name,
        period: date || "",
        description: summary || description || "",
        website: {
          label: "",
          url: url || "",
        },
      };
      await apiClient.addSectionItem(resume_id, "projects", item);
      return {
        content: [
          {
            type: "text" as const,
            text: `Project added: ${name}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to add project: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "update_section_item",
  "Update an existing item in any section",
  {
    resume_id: z.string().describe("The resume ID"),
    section: z
      .enum([
        "experience",
        "education",
        "skills",
        "projects",
        "certifications",
        "languages",
        "awards",
        "publications",
        "volunteer",
        "interests",
        "references",
        "profiles",
      ])
      .describe("Section name"),
    item_id: z.string().describe("The item ID to update"),
    updates: z.string().describe("JSON string of fields to update"),
  },
  async ({ resume_id, section, item_id, updates }) => {
    try {
      const parsedUpdates = JSON.parse(updates);
      await apiClient.updateSectionItem(resume_id, section, item_id, parsedUpdates);
      return {
        content: [
          {
            type: "text" as const,
            text: `Item ${item_id} in ${section} updated successfully.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to update item: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "remove_section_item",
  "Remove an item from a section",
  {
    resume_id: z.string().describe("The resume ID"),
    section: z
      .enum([
        "experience",
        "education",
        "skills",
        "projects",
        "certifications",
        "languages",
        "awards",
        "publications",
        "volunteer",
        "interests",
        "references",
        "profiles",
      ])
      .describe("Section name"),
    item_id: z.string().describe("The item ID to remove"),
  },
  async ({ resume_id, section, item_id }) => {
    try {
      await apiClient.removeSectionItem(resume_id, section, item_id);
      return {
        content: [
          {
            type: "text" as const,
            text: `Item removed from ${section}.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to remove item: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "toggle_section_visibility",
  "Show or hide a section on the resume",
  {
    resume_id: z.string().describe("The resume ID"),
    section: z
      .enum([
        "summary",
        "experience",
        "education",
        "skills",
        "projects",
        "certifications",
        "languages",
        "awards",
        "publications",
        "volunteer",
        "interests",
        "references",
        "profiles",
      ])
      .describe("Section name"),
    visible: z.boolean().describe("Whether the section should be visible"),
  },
  async ({ resume_id, section, visible }) => {
    try {
      const resume = await apiClient.getResume(resume_id);
      const sectionData = resume.data.sections[section as SectionName];
      const updatedSection = {
        ...sectionData,
        visible,
      };
      await apiClient.updateSection(resume_id, section as SectionName, updatedSection);
      return {
        content: [
          {
            type: "text" as const,
            text: `Section ${section} is now ${visible ? "visible" : "hidden"}.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to toggle visibility: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "delete_resume",
  "Delete a resume permanently",
  {
    resume_id: z.string().describe("The resume ID to delete"),
    confirm: z.boolean().describe("Must be true to confirm deletion"),
  },
  async ({ resume_id, confirm }) => {
    if (!confirm) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Deletion cancelled. Set confirm to true to delete.",
          },
        ],
      };
    }
    try {
      await apiClient.deleteResume(resume_id);
      return {
        content: [
          {
            type: "text" as const,
            text: "Resume deleted successfully.",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to delete resume: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "export_resume_json",
  "Export a resume as JSON",
  {
    resume_id: z.string().describe("The resume ID"),
  },
  async ({ resume_id }) => {
    try {
      const resume = await apiClient.getResume(resume_id);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(resume, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to export: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "update_resume_visibility",
  "Change resume visibility (public/private)",
  {
    resume_id: z.string().describe("The resume ID"),
    visibility: z.enum(["public", "private"]).describe("New visibility setting"),
  },
  async ({ resume_id, visibility }) => {
    try {
      await apiClient.updateResume(resume_id, { visibility });
      return {
        content: [
          {
            type: "text" as const,
            text: `Resume visibility set to ${visibility}.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to update visibility: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Reactive Resume MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
