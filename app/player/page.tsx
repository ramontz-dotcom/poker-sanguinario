"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import { supabase } from "../../lib/supabase";

type Tab = "ranking" | "jogadores" | "blinds";

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

type Stage = {
  id: string;
  nome: string;
  data_etapa: string | null;
  status: string;
  blind_profile_id: string | null;
  local_nome: string | null;
  endereco: string | null;
  notes: string | null;
  created_at: string;
};

function formatDateTime(value: string | null) {
  if (!value) return "Não agendada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return date.toLocaleString("pt-BR");
}

function stageStatusLabel(status: string) {
  switch (status) {
    case "falta_agendar":
      return "Falta agendar";
    case "agendada":
      return "Agendada";
    case "em_andamento":
      return "Em andamento";
    case "encerrada":
      return "Encerrada";
    default:
      return status;
  }
}

export default function PlayerPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("ranking");

  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  const [blindProfiles, setBlindProfiles] = useState<BlindProfile[]>([]);
  const [loadingBlinds, setLoadingBlinds] = useState(true);

  const [stage, setStage] = useState<Stage | null>(null);
  const [loadingStage, setLoadingStage] = useState(true);

  useEffect(() => {
    const mode = localStorage.getItem("poker_access_mode");

    if (mode !== "player") {
      router.push("/");
      return;
    }

    void initialize();
  }, [router]);

  async function initialize() {
    await Promise.all([loadPlayers(), loadBlindProfiles(), loadLatestStage()]);
  }

  async function loadPlayers() {
    setLoadingPlayers(true);

    const { data, error } = await supabase
      .from("players")
      .select("id, nome, apelido, pix, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar jogadores:", error);
      alert("Erro ao carregar jogadores.");
      setLoadingPlayers(false);
      return;
    }

    setPlayers((data as Player[]) || []);
    setLoadingPlayers(false);
  }

  async function loadBlindProfiles() {
    setLoadingBlinds(true);

    const { data: profiles, error: profilesError } = await supabase
      .from("blind_profiles")
      .select("id, nome, minutos, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Erro ao buscar perfis de blinds:", profilesError);
      alert("Erro ao carregar blinds.");
      setLoadingBlinds(false);
      return;
    }

    const result: BlindProfile[] = [];

    for (const profile of profiles || []) {
      const { data: levels, error: levelsError } = await supabase
        .from("blind_levels")
        .select("id, blind_profile_id, nivel, small, big")
        .eq("blind_profile_id", profile.id)
        .order("nivel", { ascending: true });

      if (levelsError) {
        console.error("Erro ao buscar níveis do blind:", levelsError);
        continue;
      }

      result.push({
        id: profile.id,
        nome: profile.nome,
        minutos: profile.minutos,
        niveis: (levels || []).map((level) => ({
          id: level.id,
          small: level.small,
          big: level.big,
        })),
      });
    }

    setBlindProfiles(result);
    setLoadingBlinds(false);
  }

  async function loadLatestStage() {
    setLoadingStage(true);

    const { data, error } = await supabase
      .from("stages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar etapa:", error);
      setLoadingStage(false);
      return;
    }

    setStage((data as Stage | null) || null);
    setLoadingStage(false);
  }

  function handleLogout() {
    localStorage.removeItem("poker_access_mode");
    router.push("/");
  }

  function openMaps() {
    if (!stage?.endereco) {
      alert("Essa etapa ainda não tem endereço cadastrado.");
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      stage.endereco
    )}`;
    window.open(url, "_blank");
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
        <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Próxima etapa</h2>
              <p className="mt-2 text-sm text-zinc-400 sm:text-base">
                Acompanhe a rodada agendada, local e endereço.
              </p>
            </div>

            {stage && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={openMaps}
                  className="rounded-2xl border border-red-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-950/30"
                >
                  Abrir no Google Maps
                </button>
              </div>
            )}
          </div>

          <div className="mt-6">
            {loadingStage ? (
              <p className="text-zinc-400">Carregando etapa...</p>
            ) : stage ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Evento</div>
                  <div className="mt-2 text-lg font-bold text-white">{stage.nome}</div>
                </div>

                <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Data</div>
                  <div className="mt-2 text-lg font-bold text-white">
                    {formatDateTime(stage.data_etapa)}
                  </div>
                </div>

                <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Status</div>
                  <div className="mt-2 text-lg font-bold text-white">
                    {stageStatusLabel(stage.status)}
                  </div>
                </div>

                <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Local</div>
                  <div className="mt-2 text-lg font-bold text-white">
                    {stage.local_nome || "Não informado"}
                  </div>
                  <div className="mt-1 text-sm text-zinc-500">
                    {stage.endereco || "Endereço não informado"}
                  </div>
                </div>

                {stage.notes && (
                  <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-red-900 bg-zinc-950/60 p-4">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">
                      Observações
                    </div>
                    <div className="mt-2 text-sm text-zinc-300 whitespace-pre-wrap">
                      {stage.notes}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-zinc-400">Nenhuma etapa cadastrada ainda.</p>
            )}
          </div>
        </div>

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
                Base visual pronta. A pontuação real entra na próxima etapa.
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

                  {sortedPlayers.length === 0 && (
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
              {sortedPlayers.length === 0 && (
                <div className="rounded-2xl border border-red-900 bg-black/80 p-4 text-zinc-500">
                  Nenhum jogador cadastrado ainda.
                </div>
              )}

              {sortedPlayers.map((player, index) => (
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
              <h2 className="text-2xl font-bold text-white">Estruturas de blinds</h2>
              <p className="mt-2 text-sm text-zinc-400 sm:text-base">
                Consulte as estruturas cadastradas para a mesa.
              </p>
            </div>

            <div className="space-y-4">
              {loadingBlinds && (
                <div className="rounded-2xl border border-red-900 bg-black/80 p-4 text-zinc-400">
                  Carregando blinds...
                </div>
              )}

              {!loadingBlinds && blindProfiles.length === 0 && (
                <div className="rounded-2xl border border-red-900 bg-black/80 p-4 text-zinc-500">
                  Nenhuma estrutura disponível ainda.
                </div>
              )}

              {!loadingBlinds &&
                blindProfiles.map((profile) => (
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