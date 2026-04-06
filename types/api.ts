export interface User {
  id: number;
  uuid?: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar?: string;
  banned?: boolean | string;
  two_fa_enabled?: boolean | string;
  created_at?: string;
  updated_at?: string;
  external_id?: string | null;
  remember_token?: string;
  discord_oauth2_id?: string | null;
  discord_oauth2_access_token?: string | null;
  discord_oauth2_linked?: string | boolean;
  discord_oauth2_username?: string | null;
  discord_oauth2_name?: string | null;
  ticket_signature?: string | null;
  mail_verify?: string | null;
  first_ip?: string;
  last_ip?: string;
  two_fa_key?: string | null;
  two_fa_blocked?: string | boolean;
  deleted?: string | boolean;
  locked?: string | boolean;
  last_seen?: string;
  first_seen?: string;
  role_id?: number;
  role?: {
    name: string;
    display_name: string;
    color: string;
  };
  permissions?: string[];
}

export interface ServerNode {
  id: number;
  uuid: string;
  public: number;
  name: string;
  description: string;
  location_id: number;
  fqdn: string;
  scheme: string;
  behind_proxy: number;
  maintenance_mode: number;
  daemonListen: number;
  daemonSFTP: number;
  created_at: string;
  updated_at: string;
}

export interface ServerLocation {
  id: number;
  name: string;
  description: string | null;
  flag_code: string;
}

export interface ServerRealm {
  id: number;
  name: string;
  description: string;
  logo: string | null;
}

export interface ServerSpell {
  id: number;
  name: string;
  description: string;
  banner: string;
  startup: string;
  docker_images: Record<string, string>;
  features: string[];
  file_denylist: string[];
  update_url: string | null;
  config_files: Record<string, any>;
  config_startup: Record<string, string>;
  config_logs: any[];
}

export interface ServerAllocation {
  id: number;
  node_id: number;
  ip: string;
  ip_alias: string;
  port: number;
  server_id: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ServerSftp {
  host: string;
  port: number;
  username: string;
  password: string;
  url: string;
}

export interface ServerVariable {
  id: number;
  server_id: number;
  variable_id: number;
  variable_value: string;
  name: string;
  description: string;
  env_variable: string;
  default_value: string;
  user_viewable: number;
  user_editable: number;
  rules: string;
  field_type: string;
  created_at: string;
  updated_at: string;
}

export interface ServerSubdomain {
  domain: string | null;
  subdomain: string | null;
}

export interface Server {
  id: number;
  external_id: string | null;
  uuid: string;
  uuidShort: string;
  node_id: number;
  name: string;
  description: string | null;
  status: string;
  suspended: number;
  skip_scripts: number;
  skip_zerotrust: number;
  owner_id: number;
  memory: number;
  swap: number;
  disk: number;
  io: number;
  cpu: number;
  threads: string | null;
  oom_disabled: number;
  allocation_id: number;
  realms_id: number;
  spell_id: number;
  startup: string;
  image: string;
  allocation_limit: number;
  database_limit: number;
  backup_limit: number;
  created_at: string;
  updated_at: string;
  installed_at: string;
  last_error: string | null;
  is_subuser: boolean;
  subuser_permissions: string[];
  subuser_id: number | null;
  node: ServerNode;
  location: ServerLocation;
  realm: ServerRealm;
  spell: ServerSpell;
  allocation: ServerAllocation;
  sftp: ServerSftp;
  variables: ServerVariable[];
  subdomain: ServerSubdomain;
}

export interface ApiErrorItem {
  code: string;
  detail: string;
  status: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T | null;
  error: boolean;
  error_message: string | null;
  error_code: string | null;
  errors?: ApiErrorItem[];
}

export interface LoginRequest {
  username_or_email: string;
  password: string;
  turnstile_token?: string;
}

export interface LoginData {
  user: User & {
    remember_token: string;
  };
  preferences: any[];
}

export type LoginResponse = ApiEnvelope<LoginData>;

export interface SessionData {
  user_info: User & {
    remember_token: string;
    role_id: number;
    role?: {
      name: string;
      display_name: string;
      color: string;
    };
  };
  permissions: string[];
  preferences: any[];
}

export type SessionResponse = ApiEnvelope<SessionData>;

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface ApiError {
  error?: string;
  message?: string;
  error_message?: string;
  error_code?: string;
  errors?: ApiErrorItem[];
}

export interface ServersPayload {
  servers: Server[];
  pagination: {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    from: number;
    to: number;
  };
  search: {
    query: string;
    has_results: boolean;
  };
}

export type ServersEnvelope = ApiEnvelope<ServersPayload>;