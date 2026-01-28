export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  linkedFiles?: string[];
  checklist?: { text: string; completed: boolean }[];
  highlights?: string[];
  timestamp: Date;
}

export interface Artifact {
  id: string;
  name: string;
  type: 'document' | 'presentation' | 'spreadsheet' | 'summary' | 'action-items' | 'meeting';
  path: string;
  createdAt: Date;
}

export interface ProgressStep {
  id: string;
  text: string;
  completed: boolean;
  substeps?: { text: string; completed: boolean }[];
}

export interface ContextFile {
  id: string;
  name: string;
  path: string;
  type: 'meeting' | 'document' | 'email' | 'notes';
}
