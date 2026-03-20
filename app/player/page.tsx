"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import { supabase } from "../../lib/supabase";

type Tab = "jogadores" | "ranking" | "blinds";

type Player = {
  id: string;
  nome: string;
  apelido: string;
  pix: string | null;
};

type BlindLevel = {
  id: string;
  small: number;
  big: number;
};

type BlindProfile = {
  id: string;
  nome: string;
  minutos: number;
  niveis: BlindLevel[];
};

export default function PlayerPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("ranking");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [blindProfiles, setBlindProfiles] = useState<BlindProfile[]>([]);

  useEffect(() => {
    const mode = localStorage.getItem("poker_access_mode");

    if (mode !== "player") {
      router.push("/");
      return;
    }

    loadPlayers();

    const savedProfiles = localStorage.getItem("poker_blind_profiles");
    if (savedProfiles) {
      setBlindProfiles(JSON.parse(savedProfiles));
    }
  }, [router]);

  async function loadPlayers() {
    setLoadingPlayers(true);

    const { data, error } = await supabase
      .from("players")
      .select("id, nome, apelido, pix, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar jogadores:", error);
      setLoadingPlayers(false);
      return;
    }

    setPlayers(data || []);
    setLoadingPlayers(false);
  }

  function handleLogout() {
    localStorage.removeItem("poker_access_mode");
    router.push("/");
  }

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => a.apelido.localeCompare(b.apelido));
  }, [players]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "ranking", label: "Ranking" },
    { key: "jogadores", label: "Jogadores" },
    { key: "blinds", label: "Blinds" },
  ];

  return (
    <AppShell role="player" onLogout={handleLogout}>
      <div className="space-y-6">
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-2 rounded-2xl border border-red-900 bg-black/60 p-2">
            {tabs.map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition sm:px-5 ${
                  tab === item.key
                    ? "bg-red-700 text-white"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "ranking" && (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
              <h2 className="text-2xl font-bold text-white">Ranking geral</h2>
              <p className="mt-2 text-sm text-zinc-400 sm:text-base">
                Base visual responsiva pronta. A pontuação online entra na próxima
                fase.
              </p>
            </div>

            <div className="hidden overflow-hidden rounded-[28px] border border-red-800 bg-black/80 shadow-2xl md:block">
              <table className="min-w-full">
                <thead className="bg-zinc-950/90">
                  <tr className="text-left text-sm text-zinc-400">
                    <th className="px-4 py-4">#</th>
                    <th className="px-4 py-4">Jogador</th>
                    <th className="px-4 py-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayers.map((player, index) => (
                    <tr
                      key={player.id}
                      className="border-t border-red-950 text-sm text-white"
                    >
                      <td className="px-4 py-4">{index + 1}</td>
                      <td className="px-4 py-4 font-semibold">{player.apelido}</td>
                      <td className="px-4 py-4 text-zinc-400">
                        Base pronta para pontuação online
                      </td>
                    </tr>
                  ))}

                  {sortedPlayers.length === 0 && !loadingPlayers && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                        Nenhum jogador cadastrado ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {loadingPlayers && (
                <div className="rounded-2xl border border-red-900 bg-black/80 p-4 text-zinc-400">
                  Carregando jogadores...
                </div>
              )}

              {!loadingPlayers && sortedPlayers.length === 0 && (
                <div className="rounded-2xl border border-red-900 bg-black/80 p-4 text-zinc-500">
                  Nenhum jogador cadastrado ainda.
                </div>
              )}

              {!loadingPlayers &&
                sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className="rounded-2xl border border-red-900 bg-black/80 p-4"
                  >
                    <div className="text-xs text-zinc-500">Posição base</div>
                    <div className="mt-1 text-lg font-bold text-white">
                      {index + 1}. {player.apelido}
                    </div>
                    <div className="mt-1 text-sm text-zinc-400">
                      Base pronta para pontuação online
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {tab === "jogadores" && (
          <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-white">Jogadores</h2>
              <span className="rounded-full border border-red-900 px-3 py-1 text-xs text-zinc-300">
                {players.length} total
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {loadingPlayers && (
                <p className="text-zinc-400">Carregando jogadores...</p>
              )}

              {!loadingPlayers && sortedPlayers.length === 0 && (
                <p className="text-zinc-400">Nenhum jogador cadastrado ainda.</p>
              )}

              {!loadingPlayers &&
                sortedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4"
                  >
                    <div className="text-lg font-bold text-white">
                      {player.apelido}
                    </div>
                    <div className="text-sm text-zinc-400">{player.nome}</div>
                    {player.pix && (
                      <div className="mt-1 text-sm text-zinc-500">
                        PIX: {player.pix}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {tab === "blinds" && (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
              <h2 className="text-2xl font-bold text-white">Estruturas de blind</h2>
              <p className="mt-2 text-sm text-zinc-400 sm:text-base">
                Base visual responsiva pronta. As estruturas ainda serão migradas para
                o banco na próxima etapa.
              </p>
            </div>

            <div className="space-y-4">
              {blindProfiles.length === 0 && (
                <div className="rounded-2xl border border-red-900 bg-black/80 p-4 text-zinc-500">
                  Nenhuma estrutura disponível neste dispositivo ainda.
                </div>
              )}

              {blindProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded-2xl border border-red-900 bg-black/80 p-4"
                >
                  <div className="text-lg font-bold text-red-400">{profile.nome}</div>
                  <div className="mt-1 text-sm text-zinc-500">
                    {profile.minutos} min por nível
                  </div>

                  <div className="mt-4 space-y-2">
                    {profile.niveis.map((level, index) => (
                      <div
                        key={level.id}
                        className="flex items-center justify-between rounded-xl border border-red-950 bg-zinc-950/60 px-4 py-3 text-sm"
                      >
                        <span className="text-zinc-300">Nível {index + 1}</span>
                        <span className="font-semibold text-white">
                          {level.small} / {level.big}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}