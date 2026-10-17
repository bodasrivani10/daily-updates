export interface SourceMessageItem {
  id: number;
  source_id: string;
  source_system: string;
  timestamp: string;
  author: string;
  work_item_id?: string;
  text: string;
  visibility: string;
  is_duplicate: boolean;
  duplicate_type?: string;
  duplicate_reason?: string;
  similarity_score?: number;
}

export interface ValidationErrorItem {
  row_number: number;
  field?: string;
  issue: string;
  suggested_correction: string;
  raw_record?: any;
}

export interface ValidationWarningItem {
  row_number: number;
  field?: string;
  warning: string;
  action_taken: string;
}

export interface ImportBatchItem {
  id: string;
  filename: string;
  total_rows: number;
  accepted_rows: number;
  rejected_rows: number;
  warning_count: number;
  duplicate_count: number;
  status: string;
  created_at: string;
  errors?: ValidationErrorItem[];
  warnings?: ValidationWarningItem[];
}

export interface WorkItemSummary {
  id: string;
  title: string;
  project_id?: string;
  project_name?: string;
  current_owner?: string;
  assigned_to_user_id?: number;
  assigned_to_name?: string;
  priority?: string;
  due_date?: string;
  resolved_status: 'completed' | 'blocked' | 'in_progress' | 'conflict' | 'needs_review' | 'unknown' | string;
  last_updated: string;
  dependencies: string[];
  progress_summary?: string;
  message_count: number;
  active_blockers_count: number;
  unresolved_conflicts_count: number;
}

export interface WorkItemDetail extends WorkItemSummary {
  messages: SourceMessageItem[];
  events: Array<{
    id: number;
    event_type: string;
    timestamp: string;
    author: string;
    notes?: string;
  }>;
  blockers: BlockerItem[];
  conflicts: ConflictItem[];
  status_history?: Array<{
    id: number;
    old_status?: string;
    new_status: string;
    changed_by_name?: string;
    timestamp: string;
    reason?: string;
  }>;
}

export interface ConflictItem {
  id: number;
  work_item_id: string;
  conflict_type: string;
  claim_a_source_id?: string;
  claim_a_summary: string;
  claim_a_author?: string;
  claim_a_timestamp?: string;
  claim_b_source_id?: string;
  claim_b_summary: string;
  claim_b_author?: string;
  claim_b_timestamp?: string;
  resolution_status: string;
  resolution_notes?: string;
}

export interface BlockerItem {
  id: number;
  work_item_id: string;
  source_id?: string;
  issue_text: string;
  impact: string;
  severity: string;
  owner: string;
  next_action: string;
  status: string;
  is_critical: boolean;
  detected_at?: string;
}

export interface DigestClaimItem {
  id?: number;
  section: string;
  claim_text: string;
  work_item_id?: string;
  severity?: string;
  owner?: string;
  impact?: string;
  confidence: number;
  supporting_source_ids: string[];
  verification_status: string;
}

export interface DigestDetail {
  id: string;
  digest_date: string;
  title: string;
  summary_headline: string;
  total_updates_analyzed: number;
  confirmed_progress_count: number;
  active_blockers_count: number;
  unresolved_conflicts_count: number;
  citation_coverage_pct: number;
  claims: DigestClaimItem[];
}

export interface EvaluationReport {
  timestamp: string;
  total_test_scenarios: number;
  passed_scenarios: number;
  critical_fact_recall_pct: number;
  citation_coverage_pct: number;
  false_completion_rate_pct: number;
  duplicate_handling_accuracy_pct: number;
  blocker_recall_pct: number;
  conflict_detection_accuracy_pct: number;
  scenario_results: Array<{
    scenario: string;
    expected: string;
    passed: boolean;
    detail: string;
  }>;
  seeded_facts_status: Array<{
    fact_id: string;
    description: string;
    recovered: boolean;
    target_item: string;
    resolved_status: string;
  }>;
}

// User & Role-Based Types
export interface UserProfile {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: 'employee' | 'manager' | 'director_ceo';
  department: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_by_manager_id?: number;
  member_count: number;
  work_item_count: number;
}

export interface InvitationItem {
  id: number;
  user_id: number;
  username: string;
  user_name?: string;
  project_id: string;
  project_name: string;
  manager_id?: number;
  manager_name?: string;
  role_in_team: string;
  status: 'pending' | 'accepted' | 'rejected';
  invited_at: string;
}

export interface RosterMember {
  id: number;
  username: string;
  name: string;
  email?: string;
  department: string;
  projects: string[];
  active_tasks_count: number;
  updates_submitted: number;
}

export interface FeedbackItem {
  id: number;
  manager_id: number;
  manager_name: string;
  employee_id: number;
  employee_name: string;
  work_item_id?: string;
  project_id?: string;
  feedback_text: string;
  sentiment: 'positive' | 'constructive' | 'critical';
  rating?: number;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  user_id?: number;
  user_name?: string;
  user_role?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface EmployeeContributionMetric {
  user_id: number;
  username: string;
  name: string;
  department: string;
  teams_and_projects: string[];
  tasks_participating: Array<{
    id: string;
    title: string;
    project_id?: string;
    status: string;
    priority: string;
  }>;
  total_updates_submitted: number;
  completed_milestones: number;
  active_blockers_assigned: number;
  recent_events: Array<{
    source_id: string;
    timestamp: string;
    text: string;
    work_item_id?: string;
  }>;
}

export interface DuplicateRecordItem {
  id: number;
  source_id: string;
  work_item_id?: string;
  author: string;
  text: string;
  timestamp: string;
  duplicate_type: string;
  duplicate_reason: string;
  similarity_score: number;
  primary_source_id: string;
}

export interface AIAgentTriageResult {
  status: string;
  agent_name: string;
  query: string;
  summary: string;
  insights: string[];
  recommended_actions: Array<{
    action: string;
    target: string;
    priority: string;
  }>;
  metrics: {
    total_items: number;
    completed: number;
    in_progress: number;
    blocked: number;
    conflicts: number;
    duplicates: number;
  };
}
