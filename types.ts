
export interface Message {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  type?: 'plan_step' | 'code_update' | 'test_log' | 'error' | 'status' | 'task_complete';
  fileName?: string;
  codeContent?: string; // For 'code_update' type
}

export interface FileEntry {
  name: string;
  content: string;
  isNew?: boolean; // True if this file was newly created during the current task
}

export interface FilesState {
  [key: string]: FileEntry;
}

export interface PlanStep {
  id: string;
  description: string;
  file?: string; // Optional file associated with the plan step
}

export enum AiActionType {
  PLAN = 'PLAN:',
  CODE_UPDATE = 'CODE_UPDATE:',
  SIMULATING_TEST = 'SIMULATING_TEST:',
  TEST_RESULT = 'TEST_RESULT:',
  TASK_COMPLETE = 'TASK_COMPLETE',
  ERROR = 'ERROR:'
}
