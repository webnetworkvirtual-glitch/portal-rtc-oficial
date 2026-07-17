export type EntityType = "empresa" | "organismo" | "persona";

export interface Entity {
  id: string;
  name: string;
  rut?: string;
  type: EntityType;
  domain?: string;
  phone?: string;
  email?: string;
  address?: string;
  category: string;
  comuna: string;
  region: string;
  totalReports: number;
  resolvedReports: number;
  avgResponseTime: number; // in days
  evidenceLevel: number; // 1 to 5 stars
  isVerified: boolean;
  createdAt: string;
}

export interface OfficialResponse {
  id: string;
  responderName: string;
  responseText: string;
  createdAt: string;
  documents?: string[];
  status: "publicado" | "en_revision";
}

export type ReportStatus = "pendiente" | "aprobado" | "rechazado" | "denunciado_fiscalia" | "archivado";

export interface Report {
  id: string;
  entityId: string;
  targetName: string;
  title: string;
  description: string;
  category: string;
  evidenceLevelScore: number;
  evidenceDocuments?: string[];
  status: ReportStatus;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
  isAnonymized: boolean;
  isModerated: boolean;
  aiDefamationExplanation?: string;
  officialResponse?: OfficialResponse;
}

export type PremiumPlanId = "free" | "ciudadano" | "empresa" | "municipio" | "periodista";

export interface UserPremiumStatus {
  email: string;
  planId: PremiumPlanId;
  status: "active" | "inactive";
  billingCycle: "mensual" | "anual";
  transactionId?: string;
  expiresAt: string;
}

export interface PatternAnalysisResult {
  hasSuspiciousPatterns: boolean;
  patternType: "Campañas Coordinadas" | "Fraude Recurrente" | "Duplicados" | "Ninguno";
  severity: "Alta" | "Media" | "Baja" | "Ninguna";
  analysisSummary: string;
  recommendations: string[];
}
