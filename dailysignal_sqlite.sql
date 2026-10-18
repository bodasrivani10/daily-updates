-- ========================================================
-- Pure SQLite DDL Script for DailySignal AI
-- Can be executed directly in sqlite3, DB Browser for SQLite, or Python
-- ========================================================

PRAGMA foreign_keys = ON;

-- TABLE: audit_logs
CREATE TABLE audit_logs (
	id INTEGER NOT NULL, 
	user_id INTEGER, 
	user_name VARCHAR(100), 
	user_role VARCHAR(50), 
	action VARCHAR(100) NOT NULL, 
	entity_type VARCHAR(50) NOT NULL, 
	entity_id VARCHAR(100) NOT NULL, 
	details_json TEXT, 
	timestamp DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL
);

-- TABLE: blockers
CREATE TABLE blockers (
	id INTEGER NOT NULL, 
	work_item_id VARCHAR(50) NOT NULL, 
	source_message_id INTEGER, 
	source_id VARCHAR(100), 
	issue_text TEXT NOT NULL, 
	impact TEXT NOT NULL, 
	severity VARCHAR(50), 
	owner VARCHAR(100), 
	next_action TEXT NOT NULL, 
	status VARCHAR(50), 
	is_critical BOOLEAN, 
	detected_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(work_item_id) REFERENCES work_items (id) ON DELETE CASCADE, 
	FOREIGN KEY(source_message_id) REFERENCES source_messages (id)
);

-- TABLE: conflicts
CREATE TABLE conflicts (
	id INTEGER NOT NULL, 
	work_item_id VARCHAR(50) NOT NULL, 
	conflict_type VARCHAR(50) NOT NULL, 
	claim_a_message_id INTEGER, 
	claim_a_source_id VARCHAR(100), 
	claim_a_summary TEXT NOT NULL, 
	claim_a_author VARCHAR(100), 
	claim_a_timestamp VARCHAR(50), 
	claim_b_message_id INTEGER, 
	claim_b_source_id VARCHAR(100), 
	claim_b_summary TEXT NOT NULL, 
	claim_b_author VARCHAR(100), 
	claim_b_timestamp VARCHAR(50), 
	resolution_status VARCHAR(50), 
	resolution_notes TEXT, 
	detected_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(work_item_id) REFERENCES work_items (id) ON DELETE CASCADE, 
	FOREIGN KEY(claim_a_message_id) REFERENCES source_messages (id), 
	FOREIGN KEY(claim_b_message_id) REFERENCES source_messages (id)
);

-- TABLE: digest_claims
CREATE TABLE digest_claims (
	id INTEGER NOT NULL, 
	digest_id VARCHAR(100) NOT NULL, 
	section VARCHAR(50) NOT NULL, 
	claim_text TEXT NOT NULL, 
	work_item_id VARCHAR(50), 
	severity VARCHAR(50), 
	owner VARCHAR(100), 
	impact TEXT, 
	confidence FLOAT, 
	supporting_source_ids_json TEXT, 
	verification_status VARCHAR(50), 
	PRIMARY KEY (id), 
	FOREIGN KEY(digest_id) REFERENCES digests (id) ON DELETE CASCADE
);

-- TABLE: digests
CREATE TABLE digests (
	id VARCHAR(100) NOT NULL, 
	digest_date VARCHAR(50) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	summary_headline TEXT NOT NULL, 
	total_updates_analyzed INTEGER, 
	confirmed_progress_count INTEGER, 
	active_blockers_count INTEGER, 
	unresolved_conflicts_count INTEGER, 
	citation_coverage_pct FLOAT, 
	created_at DATETIME, 
	PRIMARY KEY (id)
);

-- TABLE: duplicate_matches
CREATE TABLE duplicate_matches (
	id INTEGER NOT NULL, 
	import_id VARCHAR(100) NOT NULL, 
	primary_message_id INTEGER NOT NULL, 
	duplicate_message_id INTEGER NOT NULL, 
	match_type VARCHAR(50) NOT NULL, 
	confidence_score FLOAT, 
	reason VARCHAR(255) NOT NULL, 
	resolution VARCHAR(50), 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(import_id) REFERENCES imports (id) ON DELETE CASCADE, 
	FOREIGN KEY(primary_message_id) REFERENCES source_messages (id), 
	FOREIGN KEY(duplicate_message_id) REFERENCES source_messages (id)
);

-- TABLE: evidence_links
CREATE TABLE evidence_links (
	id INTEGER NOT NULL, 
	target_type VARCHAR(50) NOT NULL, 
	target_id VARCHAR(100) NOT NULL, 
	source_message_id INTEGER NOT NULL, 
	source_id VARCHAR(100) NOT NULL, 
	relevance_note VARCHAR(255), 
	PRIMARY KEY (id), 
	FOREIGN KEY(source_message_id) REFERENCES source_messages (id)
);

-- TABLE: feedbacks
CREATE TABLE feedbacks (
	id INTEGER NOT NULL, 
	manager_id INTEGER NOT NULL, 
	employee_id INTEGER NOT NULL, 
	work_item_id VARCHAR(50), 
	project_id VARCHAR(50), 
	feedback_text TEXT NOT NULL, 
	sentiment VARCHAR(20), 
	rating INTEGER, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(manager_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(employee_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(work_item_id) REFERENCES work_items (id) ON DELETE SET NULL, 
	FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE SET NULL
);

-- TABLE: gmail_integrations
CREATE TABLE gmail_integrations (
	id INTEGER NOT NULL, 
	user_id INTEGER, 
	email_address VARCHAR(200) NOT NULL, 
	account_name VARCHAR(200), 
	access_token TEXT NOT NULL, 
	refresh_token TEXT, 
	selected_label VARCHAR(100), 
	is_active BOOLEAN, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- TABLE: imports
CREATE TABLE imports (
	id VARCHAR(100) NOT NULL, 
	filename VARCHAR(255) NOT NULL, 
	uploaded_by_user_id INTEGER, 
	project_id VARCHAR(50), 
	total_rows INTEGER, 
	accepted_rows INTEGER, 
	rejected_rows INTEGER, 
	warning_count INTEGER, 
	duplicate_count INTEGER, 
	status VARCHAR(50), 
	created_at DATETIME, 
	errors_json TEXT, 
	warnings_json TEXT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(uploaded_by_user_id) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE SET NULL
);

-- TABLE: outlook_integrations
CREATE TABLE outlook_integrations (
	id INTEGER NOT NULL, 
	user_id INTEGER, 
	email_address VARCHAR(200) NOT NULL, 
	account_name VARCHAR(200), 
	access_token TEXT NOT NULL, 
	refresh_token TEXT, 
	tenant_id VARCHAR(100), 
	selected_folder VARCHAR(100), 
	is_active BOOLEAN, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- TABLE: projects
CREATE TABLE projects (
	id VARCHAR(50) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	description TEXT, 
	status VARCHAR(50), 
	created_by_manager_id INTEGER, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(created_by_manager_id) REFERENCES users (id)
);

-- TABLE: slack_integrations
CREATE TABLE slack_integrations (
	id INTEGER NOT NULL, 
	user_id INTEGER, 
	team_id VARCHAR(100) NOT NULL, 
	team_name VARCHAR(200), 
	bot_access_token VARCHAR(255) NOT NULL, 
	bot_user_id VARCHAR(100), 
	scope TEXT, 
	incoming_webhook_url TEXT, 
	incoming_webhook_channel VARCHAR(100), 
	selected_channel_id VARCHAR(100), 
	selected_channel_name VARCHAR(100), 
	authed_user_id VARCHAR(100), 
	authed_user_token VARCHAR(255), 
	is_active BOOLEAN, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- TABLE: source_messages
CREATE TABLE source_messages (
	id INTEGER NOT NULL, 
	import_id VARCHAR(100) NOT NULL, 
	source_id VARCHAR(100) NOT NULL, 
	source_system VARCHAR(50), 
	timestamp VARCHAR(50) NOT NULL, 
	author VARCHAR(100) NOT NULL, 
	author_user_id INTEGER, 
	project_id VARCHAR(50), 
	work_item_id VARCHAR(50), 
	text TEXT NOT NULL, 
	visibility VARCHAR(50), 
	content_hash VARCHAR(64) NOT NULL, 
	is_duplicate BOOLEAN, 
	duplicate_of_id INTEGER, 
	duplicate_type VARCHAR(50), 
	duplicate_reason VARCHAR(255), 
	similarity_score FLOAT, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(import_id) REFERENCES imports (id) ON DELETE CASCADE, 
	FOREIGN KEY(author_user_id) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE SET NULL, 
	FOREIGN KEY(work_item_id) REFERENCES work_items (id) ON DELETE SET NULL, 
	FOREIGN KEY(duplicate_of_id) REFERENCES source_messages (id)
);

-- TABLE: status_history
CREATE TABLE status_history (
	id INTEGER NOT NULL, 
	work_item_id VARCHAR(50) NOT NULL, 
	old_status VARCHAR(50), 
	new_status VARCHAR(50) NOT NULL, 
	changed_by_user_id INTEGER, 
	changed_by_name VARCHAR(100), 
	source_message_id INTEGER, 
	reason TEXT, 
	timestamp DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(work_item_id) REFERENCES work_items (id) ON DELETE CASCADE, 
	FOREIGN KEY(changed_by_user_id) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(source_message_id) REFERENCES source_messages (id)
);

-- TABLE: team_memberships
CREATE TABLE team_memberships (
	id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	project_id VARCHAR(50) NOT NULL, 
	manager_id INTEGER, 
	role_in_team VARCHAR(50), 
	status VARCHAR(50), 
	invited_at DATETIME, 
	responded_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE, 
	FOREIGN KEY(manager_id) REFERENCES users (id) ON DELETE SET NULL
);

-- TABLE: users
CREATE TABLE users (
	id INTEGER NOT NULL, 
	username VARCHAR(100) NOT NULL, 
	name VARCHAR(150), 
	email VARCHAR(150), 
	role VARCHAR(50), 
	department VARCHAR(100), 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	UNIQUE (username), 
	UNIQUE (email)
);

-- TABLE: work_item_events
CREATE TABLE work_item_events (
	id INTEGER NOT NULL, 
	work_item_id VARCHAR(50) NOT NULL, 
	source_message_id INTEGER NOT NULL, 
	event_type VARCHAR(50) NOT NULL, 
	claimed_status VARCHAR(50), 
	timestamp VARCHAR(50) NOT NULL, 
	author VARCHAR(100) NOT NULL, 
	notes TEXT, 
	PRIMARY KEY (id), 
	FOREIGN KEY(work_item_id) REFERENCES work_items (id) ON DELETE CASCADE, 
	FOREIGN KEY(source_message_id) REFERENCES source_messages (id)
);

-- TABLE: work_items
CREATE TABLE work_items (
	id VARCHAR(50) NOT NULL, 
	title VARCHAR(255) NOT NULL, 
	project_id VARCHAR(50), 
	current_owner VARCHAR(100), 
	assigned_to_user_id INTEGER, 
	assigned_by_user_id INTEGER, 
	priority VARCHAR(20), 
	due_date VARCHAR(50), 
	resolved_status VARCHAR(50), 
	last_updated VARCHAR(50) NOT NULL, 
	dependencies_json TEXT, 
	progress_summary TEXT, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE SET NULL, 
	FOREIGN KEY(assigned_to_user_id) REFERENCES users (id) ON DELETE SET NULL, 
	FOREIGN KEY(assigned_by_user_id) REFERENCES users (id) ON DELETE SET NULL
);

-- INDEX: ix_audit_logs_id
CREATE INDEX ix_audit_logs_id ON audit_logs (id);

-- INDEX: ix_blockers_id
CREATE INDEX ix_blockers_id ON blockers (id);

-- INDEX: ix_conflicts_id
CREATE INDEX ix_conflicts_id ON conflicts (id);

-- INDEX: ix_digest_claims_id
CREATE INDEX ix_digest_claims_id ON digest_claims (id);

-- INDEX: ix_duplicate_matches_id
CREATE INDEX ix_duplicate_matches_id ON duplicate_matches (id);

-- INDEX: ix_evidence_links_id
CREATE INDEX ix_evidence_links_id ON evidence_links (id);

-- INDEX: ix_feedbacks_id
CREATE INDEX ix_feedbacks_id ON feedbacks (id);

-- INDEX: ix_gmail_integrations_id
CREATE INDEX ix_gmail_integrations_id ON gmail_integrations (id);

-- INDEX: ix_outlook_integrations_id
CREATE INDEX ix_outlook_integrations_id ON outlook_integrations (id);

-- INDEX: ix_slack_integrations_id
CREATE INDEX ix_slack_integrations_id ON slack_integrations (id);

-- INDEX: ix_source_messages_content_hash
CREATE INDEX ix_source_messages_content_hash ON source_messages (content_hash);

-- INDEX: ix_source_messages_id
CREATE INDEX ix_source_messages_id ON source_messages (id);

-- INDEX: ix_source_messages_source_id
CREATE INDEX ix_source_messages_source_id ON source_messages (source_id);

-- INDEX: ix_source_messages_timestamp
CREATE INDEX ix_source_messages_timestamp ON source_messages (timestamp);

-- INDEX: ix_source_messages_work_item_id
CREATE INDEX ix_source_messages_work_item_id ON source_messages (work_item_id);

-- INDEX: ix_status_history_id
CREATE INDEX ix_status_history_id ON status_history (id);

-- INDEX: ix_team_memberships_id
CREATE INDEX ix_team_memberships_id ON team_memberships (id);

-- INDEX: ix_users_id
CREATE INDEX ix_users_id ON users (id);

-- INDEX: ix_work_item_events_id
CREATE INDEX ix_work_item_events_id ON work_item_events (id);

