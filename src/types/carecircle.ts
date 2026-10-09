export type { SuiAccount } from '@/components/WalletModal';

export type CaregiverRole = 'daughter' | 'nurse' | 'physio' | 'physician' | 'patient' | 'owner' | string;

export interface Caregiver {
  id: string;
  name: string;
  role: CaregiverRole;
  title: string;
  badge: string;
  avatar: string;
  color: string;
  shiftHours: string;
  responsibilities: string[];
}

export type MemoryCategory = 'medication' | 'symptom' | 'vitals' | 'diet' | 'mobility' | 'general';

export interface WalrusMemoryItem {
  id: string;
  blobId: string;
  suiObjectId?: string;
  authorId: string;
  authorName: string;
  authorRole: CaregiverRole;
  category: MemoryCategory;
  text: string;
  timestamp: string;
  status: 'confirmed' | 'pending' | 'uploading';
  similarity?: number;
  namespace: string;
  isSafetyCritical?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  authorId?: string;
  authorName?: string;
  authorRole?: CaregiverRole;
  content: string;
  timestamp: string;
  recalledMemories?: WalrusMemoryItem[];
  referencedDocs?: WalrusConsoleFile[];
  safetyAlert?: {
    level: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    recommendation: string;
    conflictingBlobs: string[];
  };
  amnesiaAlternative?: string; // Counterfactual output showing what goldfish AI said
  persistedBlobs?: string[];
  actionExecuted?: NaturalLanguageAction;
}

export interface HandoverSummary {
  date: string;
  patientName: string;
  overallStatus: 'stable' | 'attention_needed' | 'critical';
  highlights: string[];
  vitalsSummary: string;
  medicationAlerts: string[];
  mobilityNotes: string[];
  pendingActions: string[];
  totalBlobsConsulted: number;
}

export interface WalrusConsoleFile {
  id: string;
  name: string;
  bucketId: string;
  blobId: string;
  pooledBlobObjectId?: string;
  mimeType: string;
  size: number;
  contentSize: number;
  status: 'active' | 'pending' | 'uploading';
  createdAt: string;
  updatedAt?: string;
  ownerAddress?: string;
  metadata?: {
    tags?: string[];
    description?: string;
    ownerAddress?: string;
  };
}

export interface WalrusConsoleBucket {
  id: string;
  name: string;
  spaceId: string;
  status: string;
  storageUsed: number;
  fileCount: number;
  sealPolicyId: string;
  visibility: string;
  createdAt: string;
}

export interface WalrusConsoleStorageUsage {
  storageUsed: number;
  storageCap: number;
  available: number;
  percentUsed: number;
  fileCount: number;
  bucketCount: number;
}

export interface UserProfile {
  walletAddress: string;
  name: string;
  avatarUrl?: string;
  photoBlobId?: string;
  age: number;
  gender: 'female' | 'male' | 'other' | 'prefer_not_to_say';
  dateOfBirth?: string;
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';
  heightCm: number;
  weightKg: number;
  computedBmi: number;
  systolicBp: number;
  diastolicBp: number;
  heartRate: number;
  glucose: number;
  primaryConditions: string[];
  knownAllergies: string[];
  currentMedications: Array<{
    name: string;
    dosage: string;
    frequency: string;
  }>;
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  physician: string;
  walrusNamespace: string;
  updatedAt: string;
}

export interface NaturalLanguageAction {
  type: 'update_vitals' | 'update_profile' | 'add_memory' | 'upload_document' | 'fetch_records';
  label: string;
  details: Record<string, any>;
  applied: boolean;
}
