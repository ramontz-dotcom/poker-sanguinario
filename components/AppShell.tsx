"use client";

type AppShellProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  onLogout?: () => void;
  role?: "dealer" | "player";
};

export default function AppShell({
  title = "Poker Sanguinário",
  subtitle = "Liga brutal de poker entre amigos · sangue nos resultados 🩸",
  children,
  onLogout,
  role,
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-red-950 text-white">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 rounded-[28px] border border-red-800 bg-black/80 p-6 shadow-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="Poker Sanguinário"
                className="h-20 w-auto object-contain"
              />
              <div>
                <h1 className="text-2xl font-black tracking-wide text-red-500 md:text-3xl">
                  {title}
                </h1>
                <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {role && (
                <span className="rounded-full border border-red-700 px-3 py-1 text-sm text-zinc-200">
                  {role === "dealer" ? "Dealer" : "Player"}
                </span>
              )}

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="rounded-xl border border-red-800 px-4 py-2 font-semibold text-white transition hover:bg-red-900/30"
                >
                  Sair
                </button>
              )}
            </div>
          </div>
        </div>

        {children}
      </div>
    </main>
  );
}