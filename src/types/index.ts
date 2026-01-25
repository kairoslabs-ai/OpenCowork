// TypeScript type definitions for OpenCowork Frontend

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface TaskRequest {
  goal: string;
  description?: string;
}

export interface StepResponse {
  id: string;
  tool: string;
  action: string;
  parameters: Record<string, unknown>;
}

export interface PlanResponse {
  task_id: string;
  goal: string;
  steps: StepResponse[];
}

export interface ExecutionStatusResponse {
  task_id: string;
  status: ExecutionStatus;
}

export interface ExecutionResponse {
  task_id: string;
  status: ExecutionStatus;
  result: string;
  error?: string | null;
}

export interface ConfirmationRequest {
  task_id: string;
  action: string;
  confirmed: boolean;
}

export interface TaskHistoryItem {
  task_id: string;
  goal: string;
  status: ExecutionStatus;
  created_at: string;
  completed_at?: string | null;
}

export interface TaskHistoryResponse {
  tasks: TaskHistoryItem[];
  total: number;
}

export interface AuditEntry {
  id: string;
  task_id: string;
  action: string;
  timestamp: string;
  user: string;
  details: Record<string, unknown>;
}

export interface AuditLogResponse {
  entries: AuditEntry[];
  total: number;
}

export interface PolicyResponse {
  folders: FolderPolicy[];
  tools: Record<string, ToolPolicy>;
  max_tokens_per_task: number;
  max_execution_time_seconds: number;
  allow_network: boolean;
}

export interface FolderPolicy {
  path: string;
  read: boolean;
  write: boolean;
  delete: boolean;
}

export interface ToolPolicy {
  enabled: boolean;
  require_confirmation: boolean;
  rate_limit?: number;
}

export interface ErrorResponse {
  detail: string;
  status: number;
}

// ============================================================================
// Domain Types
// ============================================================================

export type ExecutionStatus =
  | "not_started"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface Task {
  task_id: string;
  goal: string;
  description: string;
  status: ExecutionStatus;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  result?: string | null;
  error?: string | null;
  metadata: Record<string, unknown>;
}

export interface Plan {
  task_id: string;
  goal: string;
  steps: Step[];
}

export interface Step {
  id: string;
  tool: string;
  action: string;
  parameters: Record<string, unknown>;
}

export interface ConfirmationPrompt {
  id: string;
  task_id: string;
  action: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

// ============================================================================
// WebSocket Event Types
// ============================================================================

export type WebSocketEventType =
  | "step_started"
  | "step_complete"
  | "confirmation_needed"
  | "task_complete"
  | "error"
  | "pong";

export interface WebSocketMessage<T = unknown> {
  type: WebSocketEventType;
  timestamp: string;
  data: T;
}

export interface StepStartedEvent {
  task_id: string;
  step_id: string;
  step_number: number;
  total_steps: number;
}

export interface StepCompleteEvent {
  task_id: string;
  step_id: string;
  result: string;
  duration_ms: number;
}

export interface ConfirmationNeededEvent {
  task_id: string;
  action: string;
  message: string;
  timeout_seconds: number;
}

export interface TaskCompleteEvent {
  task_id: string;
  status: ExecutionStatus;
  result: string;
  duration_ms: number;
}

export interface ErrorEvent {
  task_id: string;
  message: string;
  code: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface TaskCreateProps {
  onSubmit: (request: TaskRequest) => Promise<void>;
  isLoading?: boolean;
}

export interface PlanReviewProps {
  plan: Plan;
  isLoading?: boolean;
  onApprove: () => Promise<void>;
  onReject: () => void;
}

export interface ExecutionMonitorProps {
  taskId: string;
  status: ExecutionStatus;
}

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  action: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface TaskHistoryProps {
  tasks: Task[];
  isLoading?: boolean;
  onSelect: (task: Task) => void;
  onDelete: (taskId: string) => Promise<void>;
}

export interface LogViewerProps {
  taskId: string;
  logs: LogEntry[];
}

export interface PolicyManagerProps {
  policy: PolicyResponse;
  onSave: (policy: PolicyResponse) => Promise<void>;
  isLoading?: boolean;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseTaskReturn {
  task: Task | null;
  status: ExecutionStatus;
  createTask: (request: TaskRequest) => Promise<Task>;
  executeTask: (taskId: string) => Promise<void>;
  cancelTask: (taskId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  send: (data: unknown) => void;
  subscribe: (
    eventType: WebSocketEventType,
    callback: (data: unknown) => void
  ) => () => void;
  disconnect: () => void;
}

export interface UsePolicyReturn {
  policy: PolicyResponse | null;
  updatePolicy: (policy: PolicyResponse) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export interface UseQueryReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<T>;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  setFieldValue: (field: keyof T, value: unknown) => void;
  handleSubmit: (callback: (values: T) => Promise<void>) => () => Promise<void>;
  resetForm: () => void;
}

// ============================================================================
// Store Types (Zustand)
// ============================================================================

export interface TaskStore {
  // State
  tasks: Task[];
  currentTask: Task | null;
  isExecuting: boolean;
  history: Task[];

  // Actions
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  setCurrentTask: (task: Task | null) => void;
  clearHistory: () => void;
}

export interface UIStore {
  // State
  confirmDialog: ConfirmationPrompt | null;
  toasts: Toast[];
  sidebarOpen: boolean;
  theme: "light" | "dark";

  // Actions
  showConfirmation: (prompt: ConfirmationPrompt) => void;
  hideConfirmation: () => void;
  addToast: (toast: Toast) => void;
  removeToast: (toastId: string) => void;
  toggleSidebar: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

export interface APIStore {
  // State
  baseUrl: string;
  token: string | null;
  isConnected: boolean;

  // Actions
  setBaseUrl: (url: string) => void;
  setToken: (token: string | null) => void;
  checkConnectivity: () => Promise<boolean>;
}

// ============================================================================
// UI Component Types
// ============================================================================

export interface ButtonProps {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export interface InputProps {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export interface ToastProps {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
  onClose: () => void;
}

export interface ProgressProps {
  current: number;
  total: number;
  label?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface LogEntry {
  id: string;
  level: "DEBUG" | "INFO" | "WARNING" | "ERROR";
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
}

export interface APIError extends Error {
  status: number;
  statusText: string;
}

// ============================================================================
// Form Types
// ============================================================================

export interface TaskCreateFormValues {
  goal: string;
  description: string;
}

export interface PolicyFormValues {
  folders: FolderPolicy[];
  tools: Record<string, ToolPolicy>;
  max_tokens_per_task: number;
  max_execution_time_seconds: number;
  allow_network: boolean;
}

// ============================================================================
// API Client Configuration
// ============================================================================

export interface APIClientConfig {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface WebSocketConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}
