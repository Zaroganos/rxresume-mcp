import type {
  AuthTokens,
  User,
  LoginResponse,
  Resume,
  ResumeListItem,
  ResumeListItemV5,
  CreateResumeDto,
  CreateResumeDtoV5,
  UpdateResumeDto,
  UpdateResumeDtoV5,
  SectionName,
  ResumeData,
  ResumeV5,
} from "./types.js";

// This API client is designed for Reactive Resume v5 only.
// v5 uses OpenAPI endpoints with API key authentication.
// API keys can be created in Settings > API Keys in the Reactive Resume dashboard.

export class RxResumeApiClient {
  private baseUrl: string;
  private apiKey: string | null = null;
  // Legacy token support for backwards compatibility
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private cookies: string[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
  }

  getTokens(): AuthTokens | null {
    if (this.accessToken && this.refreshToken) {
      return {
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
      };
    }
    return null;
  }

  isAuthenticated(): boolean {
    return this.apiKey !== null || this.accessToken !== null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // v5 API key authentication (preferred)
    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }
    // Fallback to legacy token auth
    else if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    if (this.cookies.length > 0) {
      headers["Cookie"] = this.cookies.join("; ");
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && this.refreshToken && !this.apiKey) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers["Authorization"] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(url, {
          ...options,
          headers,
        });
        if (!retryResponse.ok) {
          const errorText = await retryResponse.text();
          throw new Error(
            `API request failed: ${retryResponse.status} ${retryResponse.statusText} - ${errorText}`
          );
        }
        return retryResponse.json() as Promise<T>;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return response.json() as Promise<T>;
    }
    return response.text() as unknown as T;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    // v5 uses Better Auth endpoint - requires Origin header
    const response = await fetch(`${this.baseUrl}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": this.baseUrl,
      },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Login failed: ${response.status} - ${errorText}`);
    }

    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    if (setCookieHeaders.length > 0) {
      this.cookies = [];
      for (const cookie of setCookieHeaders) {
        const cookiePart = cookie.split(";")[0];
        this.cookies.push(cookiePart);
        
        // v5 Better Auth session token
        if (cookiePart.startsWith("better-auth.session_token=")) {
          this.accessToken = cookiePart.replace("better-auth.session_token=", "");
        }
      }
    }

    const data = (await response.json()) as LoginResponse;
    return data;
  }

  async loginWithTokens(
    accessToken: string,
    refreshToken: string
  ): Promise<User> {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    return this.getCurrentUser();
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `Refresh=${this.refreshToken}`,
        },
      });

      if (!response.ok) return false;

      const setCookieHeader = response.headers.get("set-cookie");
      if (setCookieHeader) {
        const accessTokenMatch = setCookieHeader.match(
          /Authentication=([^;]+)/
        );
        if (accessTokenMatch) {
          this.accessToken = accessTokenMatch[1];
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    await this.request("/api/auth/sign-out", { method: "POST" });
    this.accessToken = null;
    this.refreshToken = null;
    this.cookies = [];
  }

  async getCurrentUser(): Promise<User> {
    // v5 uses Better Auth session endpoint
    const session = await this.request<{ user: User }>("/api/auth/get-session");
    return session.user;
  }

  async listResumes(): Promise<ResumeListItem[]> {
    // v5 uses OpenAPI endpoint with GET method
    const v5Resumes = await this.request<ResumeListItemV5[]>(
      "/api/openapi/resume/list?sort=lastUpdatedAt",
      { method: "GET" }
    );
    // Convert v5 format to normalized format
    return v5Resumes.map((r) => ({
      id: r.id,
      title: r.name, // v5 uses 'name' instead of 'title'
      slug: r.slug,
      visibility: r.isPublic ? "public" : "private", // v5 uses boolean isPublic
      locked: r.isLocked, // v5 uses isLocked
      createdAt: r.createdAt.toString(),
      updatedAt: r.updatedAt.toString(),
    }));
  }

  async getResume(id: string): Promise<Resume> {
    // v5 uses OpenAPI endpoint with GET method
    const v5Resume = await this.request<ResumeV5>(`/api/openapi/resume/${id}`, {
      method: "GET",
    });
    // Convert v5 format to normalized format
    return {
      id: v5Resume.id,
      title: v5Resume.name,
      slug: v5Resume.slug,
      data: v5Resume.data,
      visibility: v5Resume.isPublic ? "public" : "private",
      locked: v5Resume.isLocked,
      userId: "",
      createdAt: "",
      updatedAt: "",
    };
  }

  async createResume(dto: CreateResumeDto): Promise<Resume> {
    // v5 uses OpenAPI endpoint with POST method
    const v5Dto: CreateResumeDtoV5 = {
      name: dto.title,
      slug: dto.slug,
      tags: [],
      withSampleData: false,
    };
    const resumeId = await this.request<string>("/api/openapi/resume/create", {
      method: "POST",
      body: JSON.stringify(v5Dto),
    });
    // Fetch the created resume to return full data
    return this.getResume(resumeId);
  }

  async updateResume(id: string, dto: UpdateResumeDto): Promise<Resume> {
    // v5 uses OpenAPI endpoint with PUT method
    const v5Dto: Partial<UpdateResumeDtoV5> = {};
    if (dto.title !== undefined) v5Dto.name = dto.title;
    if (dto.slug !== undefined) v5Dto.slug = dto.slug;
    if (dto.data !== undefined) v5Dto.data = dto.data as ResumeData;
    if (dto.visibility !== undefined) v5Dto.isPublic = dto.visibility === "public";
    
    await this.request<unknown>(`/api/openapi/resume/${id}`, {
      method: "PUT",
      body: JSON.stringify(v5Dto),
    });
    // Fetch updated resume to return
    return this.getResume(id);
  }

  async deleteResume(id: string): Promise<void> {
    await this.request(`/api/openapi/resume/${id}`, {
      method: "DELETE",
    });
  }

  async lockResume(id: string, locked: boolean): Promise<Resume> {
    // v5 uses OpenAPI endpoint for setting lock status
    await this.request(`/api/openapi/resume/${id}/lock`, {
      method: "PUT",
      body: JSON.stringify({ isLocked: locked }),
    });
    return this.getResume(id);
  }

  async updateResumeData(
    id: string,
    data: Partial<ResumeData>
  ): Promise<Resume> {
    const resume = await this.getResume(id);
    const mergedData = {
      ...resume.data,
      ...data,
      basics: data.basics ? { ...resume.data.basics, ...data.basics } : resume.data.basics,
      sections: data.sections ? { ...resume.data.sections, ...data.sections } : resume.data.sections,
    };
    return this.updateResume(id, { data: mergedData });
  }

  async updateSection<T>(
    resumeId: string,
    sectionName: SectionName,
    sectionData: T
  ): Promise<Resume> {
    const resume = await this.getResume(resumeId);
    const updatedSections = {
      ...resume.data.sections,
      [sectionName]: sectionData,
    };
    return this.updateResumeData(resumeId, { sections: updatedSections as ResumeData["sections"] });
  }

  async addSectionItem<T extends { id: string }>(
    resumeId: string,
    sectionName: SectionName,
    item: T
  ): Promise<Resume> {
    const resume = await this.getResume(resumeId);
    const section = resume.data.sections[sectionName] as unknown as { items: T[] };
    const updatedSection = {
      ...section,
      items: [...section.items, item],
    };
    return this.updateSection(resumeId, sectionName, updatedSection);
  }

  async updateSectionItem<T extends { id: string }>(
    resumeId: string,
    sectionName: SectionName,
    itemId: string,
    updates: Partial<T>
  ): Promise<Resume> {
    const resume = await this.getResume(resumeId);
    const section = resume.data.sections[sectionName] as unknown as { items: T[] };
    const updatedItems = section.items.map((item) =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    const updatedSection = {
      ...section,
      items: updatedItems,
    };
    return this.updateSection(resumeId, sectionName, updatedSection);
  }

  async removeSectionItem(
    resumeId: string,
    sectionName: SectionName,
    itemId: string
  ): Promise<Resume> {
    const resume = await this.getResume(resumeId);
    const section = resume.data.sections[sectionName] as { items: { id: string }[] };
    const updatedSection = {
      ...section,
      items: section.items.filter((item) => item.id !== itemId),
    };
    return this.updateSection(resumeId, sectionName, updatedSection);
  }

  async updateBasics(
    resumeId: string,
    basics: Partial<ResumeData["basics"]>
  ): Promise<Resume> {
    const resume = await this.getResume(resumeId);
    const updatedBasics = {
      ...resume.data.basics,
      ...basics,
    };
    return this.updateResumeData(resumeId, { basics: updatedBasics });
  }

  async getResumeSchema(): Promise<unknown> {
    return this.request("/api/resume/schema");
  }

  async printResume(
    id: string,
    format: "pdf" = "pdf"
  ): Promise<ArrayBuffer> {
    const response = await fetch(`${this.baseUrl}/api/resume/print/${id}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: format === "pdf" ? "application/pdf" : "image/jpeg",
      },
    });

    if (!response.ok) {
      throw new Error(`Print failed: ${response.status}`);
    }

    return response.arrayBuffer();
  }

  async healthCheck(): Promise<{ status: string }> {
    try {
      return await this.request<{ status: string }>("/api/health");
    } catch {
      // Some instances may not have /api/health, check root
      const response = await fetch(`${this.baseUrl}`);
      return { status: response.ok ? "healthy" : "unhealthy" };
    }
  }
}

export function createApiClient(baseUrl: string): RxResumeApiClient {
  return new RxResumeApiClient(baseUrl);
}
