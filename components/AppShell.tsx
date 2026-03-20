import { ReactNode } from "react";

type AppShellProps = {
  role: "dealer" | "player";
  onLogout: () => void;
  children: ReactNode;
};

export default function AppShell({
  role,
  onLogout,
  children,
}: AppShellProps) {
  const roleLabel = role === "dealer" ? "Dealer" : "Player";
  const roleDescription =
    role === "dealer"
      ? "Controle da mesa e configuração da liga"
      : "Acompanhe ranking, jogadores e blinds";

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-red-950 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="rounded-[28px] border border-red-800 bg-black/80 p-4 shadow-2xl sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <img
                src="/logo.png"
                alt="Poker Sanguinário"
                className="h-14 w-14 rounded-xl object-contain sm:h-16 sm:w-16"
              />

              <div>
                <h1 className="text-2xl font-black tracking-tight text-red-500 sm:text-3xl">
                  Poker Sanguinário
                </h1>
                <p className="mt-1 text-sm text-zinc-400 sm:text-base">
                  {roleDescription}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 md:justify-end">
              <span className="inline-flex items-center rounded-full border border-red-800 px-3 py-2 text-sm font-semibold text-white">
                {roleLabel}
              </span>

              <button
                onClick={onLogout}
                className="rounded-xl border border-red-800 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-red-950/40"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        <section className="mt-6">{children}</section>
      </div>
    </main>
  );
}