/// <reference types="astro/client" />

import type { User } from "@supabase/supabase-js";

declare global {
  namespace App {
    interface Locals {
      user?: User;
    }
  }
}

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly VERCEL_DEPLOY_HOOK_URL?: string;
  readonly GOOGLE_BUSINESS_CLIENT_ID?: string;
  readonly GOOGLE_BUSINESS_CLIENT_SECRET?: string;
  readonly GOOGLE_BUSINESS_REFRESH_TOKEN?: string;
  readonly GOOGLE_BUSINESS_ACCOUNT_ID?: string;
  readonly GOOGLE_BUSINESS_LOCATION_ID?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
