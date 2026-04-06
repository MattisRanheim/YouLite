import { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    access_token: string;
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    error?: string;
  }
}
