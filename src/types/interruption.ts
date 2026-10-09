export interface InterruptionRecord {
  id: string; // Incident ID e.g. 2026-000001
  substation: string; // SS e.g. QZN, TAL
  feeder: string; // Feeder e.g. F31
  dateOfInterruption: string; // Date of Interuption e.g. September 01, 2026
  affectedArea: string; // Affected Area
  poleId: string; // POLE ID
  startTime: string; // StartTime of Interruption e.g. 1:15:00
  restoredDate: string | null; // Restored Date (null if Active)
  restoredTime: string | null; // Restored Time (null if Active)
  actionTaken: string; // ActionTaken
  durationMinutes: number | null; // Duration (Minutes)
  affectedConsumers: number; // Number of Affected Consumers
  causeCode: string; // Cause of Interrution e.g. 011
  weatherCode: string; // Weather e.g. 104
  isolationDeviceCode: string; // Isolation Device e.g. 203
  equipmentFailedCode: string; // Equipment Failed e.g. 301
  remarks: string; // Remarks
  estimatedKwHrLoss: number | null; // Estimated KwHr Loss
  estimatedRevenueLoss: number | null; // Estimated Revenue Loss
  interruptionType: string; // Lateral, Block, Supply, Backbone, Feeder, Substation
  status: 'Active' | 'Resolve' | 'Scheduled' | string; // Status
  createdAt?: string;
  updatedAt?: string;
}

export interface ReferenceItem {
  code: string;
  description: string;
  category?: string;
}

export interface ReferenceTables {
  classifications: ReferenceItem[];
  causes: ReferenceItem[];
  weather: ReferenceItem[];
  isolationDevices: ReferenceItem[];
  equipmentFailed: ReferenceItem[];
  substations: ReferenceItem[];
  feeders: ReferenceItem[];
}

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'viewer'; // Administrator or Regular user (viewer)
  email?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface FilterState {
  searchQuery: string;
  dateStart: string;
  dateEnd: string;
  substation: string;
  feeder: string;
  causeCode: string;
  equipmentFailedCode: string;
  interruptionType: string;
  status: string;
}
