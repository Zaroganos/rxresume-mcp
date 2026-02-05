export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  name: string;
  picture?: string | null;
  username: string;
  email: string;
  locale: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  status: string;
  user: User;
}

export interface ResumeBasics {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  url: {
    label: string;
    href: string;
  };
  customFields: Array<{
    id: string;
    icon: string;
    name: string;
    value: string;
  }>;
  picture: {
    url: string;
    size: number;
    aspectRatio: number;
    borderRadius: number;
    effects: {
      hidden: boolean;
      border: boolean;
      grayscale: boolean;
    };
  };
}

export interface ResumeSection<T = unknown> {
  name: string;
  columns: number;
  separateLinks: boolean;
  visible: boolean;
  id: string;
  items: T[];
}

export interface ExperienceItem {
  id: string;
  visible: boolean;
  company: string;
  position: string;
  location: string;
  date: string;
  summary: string;
  url: {
    label: string;
    href: string;
  };
}

export interface EducationItem {
  id: string;
  visible: boolean;
  institution: string;
  studyType: string;
  area: string;
  score: string;
  date: string;
  summary: string;
  url: {
    label: string;
    href: string;
  };
}

export interface SkillItem {
  id: string;
  visible: boolean;
  name: string;
  description: string;
  level: number;
  keywords: string[];
}

export interface ProjectItem {
  id: string;
  visible: boolean;
  name: string;
  description: string;
  date: string;
  summary: string;
  keywords: string[];
  url: {
    label: string;
    href: string;
  };
}

export interface CertificationItem {
  id: string;
  visible: boolean;
  name: string;
  issuer: string;
  date: string;
  summary: string;
  url: {
    label: string;
    href: string;
  };
}

export interface LanguageItem {
  id: string;
  visible: boolean;
  name: string;
  description: string;
  level: number;
}

export interface AwardItem {
  id: string;
  visible: boolean;
  title: string;
  awarder: string;
  date: string;
  summary: string;
  url: {
    label: string;
    href: string;
  };
}

export interface PublicationItem {
  id: string;
  visible: boolean;
  name: string;
  publisher: string;
  date: string;
  summary: string;
  url: {
    label: string;
    href: string;
  };
}

export interface VolunteerItem {
  id: string;
  visible: boolean;
  organization: string;
  position: string;
  location: string;
  date: string;
  summary: string;
  url: {
    label: string;
    href: string;
  };
}

export interface InterestItem {
  id: string;
  visible: boolean;
  name: string;
  keywords: string[];
}

export interface ReferenceItem {
  id: string;
  visible: boolean;
  name: string;
  description: string;
  summary: string;
  url: {
    label: string;
    href: string;
  };
}

export interface ProfileItem {
  id: string;
  visible: boolean;
  network: string;
  username: string;
  icon: string;
  url: {
    label: string;
    href: string;
  };
}

export interface CustomSectionItem {
  id: string;
  visible: boolean;
  name: string;
  description: string;
  date: string;
  location: string;
  summary: string;
  keywords: string[];
  url: {
    label: string;
    href: string;
  };
}

export interface ResumeSections {
  summary: ResumeSection<{ id: string; visible: boolean; content: string }>;
  experience: ResumeSection<ExperienceItem>;
  education: ResumeSection<EducationItem>;
  skills: ResumeSection<SkillItem>;
  projects: ResumeSection<ProjectItem>;
  certifications: ResumeSection<CertificationItem>;
  languages: ResumeSection<LanguageItem>;
  awards: ResumeSection<AwardItem>;
  publications: ResumeSection<PublicationItem>;
  volunteer: ResumeSection<VolunteerItem>;
  interests: ResumeSection<InterestItem>;
  references: ResumeSection<ReferenceItem>;
  profiles: ResumeSection<ProfileItem>;
  custom: Record<string, ResumeSection<CustomSectionItem>>;
}

export interface ResumeMetadata {
  template: string;
  layout: Array<Array<Array<string>>>;
  css: {
    value: string;
    visible: boolean;
  };
  page: {
    margin: number;
    format: string;
    options: {
      breakLine: boolean;
      pageNumbers: boolean;
    };
  };
  theme: {
    background: string;
    text: string;
    primary: string;
  };
  typography: {
    font: {
      family: string;
      subset: string;
      variants: string[];
      size: number;
    };
    lineHeight: number;
    hideIcons: boolean;
    underlineLinks: boolean;
  };
  notes: string;
}

export interface ResumeData {
  basics: ResumeBasics;
  sections: ResumeSections;
  metadata: ResumeMetadata;
}

export interface Resume {
  id: string;
  title: string;
  slug: string;
  data: ResumeData;
  visibility: "private" | "public";
  locked: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeListItem {
  id: string;
  title: string;
  slug: string;
  visibility: "private" | "public";
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResumeDto {
  title: string;
  slug: string;
  visibility?: "private" | "public";
}

export interface UpdateResumeDto {
  title?: string;
  slug?: string;
  visibility?: "private" | "public";
  data?: Partial<ResumeData>;
}

export type SectionName = 
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "languages"
  | "awards"
  | "publications"
  | "volunteer"
  | "interests"
  | "references"
  | "profiles";

// v5 Types - Reactive Resume v5 uses different field names
export interface ResumeListItemV5 {
  id: string;
  name: string; // v5 uses 'name' instead of 'title'
  slug: string;
  tags: string[];
  isPublic: boolean; // v5 uses boolean instead of 'visibility' string
  isLocked: boolean; // v5 uses 'isLocked' instead of 'locked'
  createdAt: Date;
  updatedAt: Date;
}

export interface ResumeV5 {
  id: string;
  name: string;
  slug: string;
  tags: string[];
  data: ResumeData;
  isPublic: boolean;
  isLocked: boolean;
  hasPassword: boolean;
}

export interface CreateResumeDtoV5 {
  name: string;
  slug: string;
  tags: string[];
  withSampleData?: boolean;
}

export interface UpdateResumeDtoV5 {
  id: string;
  name?: string;
  slug?: string;
  tags?: string[];
  data?: ResumeData;
  isPublic?: boolean;
}
