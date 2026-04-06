import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to refresh token");

  return {
    access_token: data.access_token as string,
    // Google returns expires_in in seconds
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in as number),
    refresh_token: (data.refresh_token as string | undefined) ?? refreshToken,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/youtube.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // First sign-in: persist tokens from the account object
      if (account) {
        return {
          ...token,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
        };
      }

      // Token still valid
      if (
        typeof token.expires_at === "number" &&
        Date.now() / 1000 < token.expires_at - 60
      ) {
        return token;
      }

      // Token expired — refresh it
      if (!token.refresh_token) return { ...token, error: "no_refresh_token" };

      try {
        const refreshed = await refreshAccessToken(token.refresh_token as string);
        return {
          ...token,
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token,
          expires_at: refreshed.expires_at,
          error: undefined,
        };
      } catch (err) {
        console.error("Token refresh failed:", err);
        return { ...token, error: "refresh_error" };
      }
    },
    async session({ session, token }) {
      session.access_token = token.access_token as string;
      if (token.error) session.error = token.error as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
