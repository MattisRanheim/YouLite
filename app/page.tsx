import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Feed from "@/components/Feed";
import Image from "next/image";

export default async function HomePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user;

  return (
    <main className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background/90 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-red-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
          </svg>
          <span className="text-text-primary text-sm font-semibold tracking-tight">
            YT Feed
          </span>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="flex items-center gap-2 group"
            title="Sign out"
          >
            {user?.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "User"}
                width={28}
                height={28}
                className="rounded-full ring-1 ring-border group-hover:ring-white/30 transition-all"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-surface-elevated ring-1 ring-border flex items-center justify-center text-xs text-text-muted">
                {user?.name?.[0] ?? "?"}
              </div>
            )}
          </button>
        </form>
      </header>

      {/* Feed */}
      <Feed />
    </main>
  );
}
