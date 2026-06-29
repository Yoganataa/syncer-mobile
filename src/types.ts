export interface Creator {
  username: string;
  display_name?: string;
  avatar_url?: string;
  enabled: boolean;
  live_enabled: boolean;
  feed_enabled: boolean;
  bulk_enabled: boolean;
  record_enabled: boolean;
  notify_enabled: boolean;
  send_message_enabled: boolean;
  live_status: string;
  is_active: boolean;
  last_scan?: {
    scanned_at?: string;
    status?: string;
    error?: string;
  };
  created_at: string;
  updated_at: string;
  stats?: {
    feed_downloads: number;
    bulk_downloads: number;
    total_downloads: number;
  };
}

export interface Job {
  _id: string;
  job_id: string;
  type: string;
  username: string;
  status: string;
  error?: string;
  error_traceback?: string;
  source_url?: string;
  attempts?: number;
  max_attempts?: number;
  progress?: { message?: string; percent?: number };
  created_at: string;
  updated_at: string;
  started_at?: string;
}

export interface RelayChat {
  id: string;
  platform: string;
  chat_id: string;
  title: string;
  username?: string;
  is_active: boolean;
}

export interface DashboardStats {
  queue: { running: number; queued: number };
  lanes: {
    live: { running: number; queued: number };
    download: { running: number; queued: number };
    upload: { running: number; queued: number };
  };
  watch: { live: number; feed: number; live_active: number };
  cooldowns: { active: number; lanes: Record<string, number> };
  resolver: { snapshots: number; failed: number; stream_pending: number };
  recent_errors: Array<{ job: string; type: string; status: string; user: string; error: string }>;
  tmp_used: string;
  system: {
    os: string;
    cpu: { percent: number; cores: number; model: string };
    ram: { app_used: string; system_percent: number; system_total: string };
    disk: { percent: number; used: string; total: string };
    uptime: { bot: string; os: string };
    mongo: { collections: number; data_size: string; storage_size: string; objects: number; indexes: number };
    third_party_apps: Record<string, { cpu_percent: number; ram_used: string; instances: number }>;
  };
}

export interface RelayProfile {
  name: string
  source_chat_id: number
  source_type: string
  enabled: boolean
  mode: string
  source_username?: string
  source_title?: string
  members_count?: number
  last_message_id?: number
  target_topic_id?: number
  photo_file_id?: string
  skip_words?: string[]
  filters?: {
    kinds?: string[]
    include_keywords?: string[]
    exclude_keywords?: string[]
    file_ext_include?: string[]
    min_file_size?: number | null
    max_file_size?: number | null
  }
  stats?: {
    copied: number
    forwarded: number
    skipped: number
    failed: number
  }
}

export interface SavedLink {
  username: string
  display_name?: string
  avatar_url?: string
  is_creator?: boolean
  urls?: string[]
  profile_info?: {
    username: string
    display_name?: string
    avatar_url?: string
    follower_count?: number
    following_count?: number
    bio?: string
  }
  created_at: string
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ApiError {
  detail: string;
}
