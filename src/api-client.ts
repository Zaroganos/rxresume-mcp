import type {
  AuthTokens,
  User,
  LoginResponse,
  Resume,
  ResumeListItem,
  CreateResumeDto,
  UpdateResumeDto,
  SectionName,
  ResumeData,
} from "./types.js";

export class RxResumeApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private cookies: string[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
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
    return this.accessToken !== null;
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

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    if (this.cookies.length > 0) {
      headers["Cookie"] = this.cookies.join("; ");
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && this.refreshToken) {
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
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identifier: email, password }),
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
        
        if (cookiePart.startsWith("Authentication=")) {
          this.accessToken = cookiePart.replace("Authentication=", "");
        }
        if (cookiePart.startsWith("Refresh=")) {
          this.refreshToken = cookiePart.replace("Refresh=", "");
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
    await this.request("/api/auth/logout", { method: "POST" });
    this.accessToken = null;
    this.refreshToken = null;
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>("/api/user/me");
  }

  async listResumes(): Promise<ResumeListItem[]> {
    return this.request<ResumeListItem[]>("/api/resume");
  }

  async getResume(id: string): Promise<Resume> {
    return this.request<Resume>(`/api/resume/${id}`);
  }

  async createResume(dto: CreateResumeDto): Promise<Resume> {
    return this.request<Resume>("/api/resume", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async updateResume(id: string, dto: UpdateResumeDto): Promise<Resume> {
    return this.request<Resume>(`/api/resume/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  }

  async deleteResume(id: string): Promise<void> {
    await this.request(`/api/resume/${id}`, { method: "DELETE" });
  }

  async lockResume(id: string, locked: boolean): Promise<Resume> {
    return this.request<Resume>(`/api/resume/${id}/lock`, {
      method: "PATCH",
      body: JSON.stringify({ locked }),
    });
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
    return this.request<{ status: string }>("/api/health");
  }
}

export function createApiClient(baseUrl: string): RxResumeApiClient {
  return new RxResumeApiClient(baseUrl);
}
