"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import { supabase } from "../../lib/supabase";

type Tab = "ao_vivo" | "ranking_geral" | "ranking_etapa" | "blinds" | "jogadores";

type Player = {
  id: string;
  nome: string;
  apelido: string;
  pix: string | null;
  created_at?: string;
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
  buy_in_default: number | null;
  rebuy_default: number | null;
  addon_default: number | null;
  drink_total: number | null;
  food_total: number | null;
  admin_fee_total: number | null;
  prize_1: number | null;
  prize_2: number | null;
  prize_3: number | null;
  prize_4: number | null;
  prize_notes: string | null;
  created_at: string;
};

type StageEntry = {
  id: string;
  stage_id: string;
  player_id: string;
  inscrito: boolean;
  eliminado: boolean;
  buy_in: number | null;
  rebuys: number | null;
  rebuy_value: number | null;
  addon: boolean;
  addon_value: number | null;
  drink: boolean;
  food: boolean;
  admin_fee: boolean;
  position: number | null;
  created_at: string;
};

type RankingRow = {
  playerId: string;
  apelido: string;
  nome: string;
  totalPoints: number;
  playedStages: number;
  wins: number;
  podiums: number;
};

const F1_POINTS: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
};

function formatMoney(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "Não agendada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return date.toLocaleString("pt-BR");
}

function stageStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Rascunho";
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

function pointsForPosition(position: number | null | undefined) {
  if (!position) return 0;
  return F1_POINTS[position] || 0;
}

export default function PlayerPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("ao_vivo");

  const [players, setPlayers] = useState<Player[]>([]);
  const [blindProfiles, setBlindProfiles] = useState<BlindProfile[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [entries, setEntries] = useState<StageEntry[]>([]);

  const [loading, setLoading] = useState(true);

  const [selectedRankingStageId, setSelectedRankingStageId] = useState<string>("");

  useEffect(() => {
    const mode = localStorage.getItem("poker_access_mode");
    if (mode !== "player") {
      router.push("/");
      return;
    }
    void initialize();
  }, [router]);

  async function initialize() {
    setLoading(true);
    await Promise.all([loadPlayers(), loadBlindProfiles(), loadStages(), loadEntries()]);
    setLoading(false);
  }

  async function loadPlayers() {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("apelido", { ascending: true });

    if (error) {
      console.error("Erro ao buscar jogadores:", error);
      alert("Erro ao carregar jogadores.");
      return;
    }

    setPlayers((data as Player[]) || []);
  }

  async function loadBlindProfiles() {
    const { data: profiles, error: profilesError } = await supabase
      .from("blind_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Erro ao buscar blinds:", profilesError);
      alert("Erro ao carregar blinds.");
      return;
    }

    const result: BlindProfile[] = [];

    for (const profile of profiles || []) {
      const { data: levels, error: levelsError } = await supabase
        .from("blind_levels")
        .select("*")
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
  }

  async function loadStages() {
    const { data, error } = await supabase
      .from("stages")
      .select("*")
      .order("data_etapa", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar etapas:", error);
      alert("Erro ao carregar etapas.");
      return;
    }

    const rows = (data as Stage[]) || [];
    setStages(rows);

    const activeStage = rows.find((stage) => stage.status === "em_andamento");
    const latestClosedStage = rows.find((stage) => stage.status === "encerrada");
    setSelectedRankingStageId(activeStage?.id || latestClosedStage?.id || rows[0]?.id || "");
  }

  async function loadEntries() {
    const { data, error } = await supabase
      .from("stage_entries")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao carregar entradas:", error);
      alert("Erro ao carregar entradas.");
      return;
    }

    setEntries((data as StageEntry[]) || []);
  }

  function handleLogout() {
    localStorage.removeItem("poker_access_mode");
    router.push("/");
  }

  function getPlayerById(playerId: string) {
    return players.find((player) => player.id === playerId);
  }

  const activeStage = useMemo(() => {
    return stages.find((stage) => stage.status === "em_andamento") || null;
  }, [stages]);

  const nextStage = useMemo(() => {
    if (activeStage) return activeStage;
    return stages.find((stage) => stage.status === "agendada") || stages[0] || null;
  }, [stages, activeStage]);

  const activeBlindProfile = useMemo(() => {
    if (!activeStage) return null;
    return (
      blindProfiles.find((profile) => profile.id === activeStage.blind_profile_id) || null
    );
  }, [activeStage, blindProfiles]);

  const activeStageEntries = useMemo(() => {
    if (!activeStage) return [];
    return entries
      .filter((entry) => entry.stage_id === activeStage.id)
      .sort((a, b) => {
        const aPlayer = getPlayerById(a.player_id)?.apelido || "";
        const bPlayer = getPlayerById(b.player_id)?.apelido || "";
        return aPlayer.localeCompare(bPlayer);
      });
  }, [entries, activeStage, players]);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => a.apelido.localeCompare(b.apelido));
  }, [players]);

  const overallRanking = useMemo(() => {
    const closedStagesIds = new Set(
      stages.filter((stage) => stage.status === "encerrada").map((stage) => stage.id)
    );

    const map = new Map<string, RankingRow>();

    for (const entry of entries) {
      if (!closedStagesIds.has(entry.stage_id)) continue;
      if (!entry.position) continue;

      const player = getPlayerById(entry.player_id);
      if (!player) continue;

      const current = map.get(entry.player_id) || {
        playerId: entry.player_id,
        apelido: player.apelido,
        nome: player.nome,
        totalPoints: 0,
        playedStages: 0,
        wins: 0,
        podiums: 0,
      };

      const pts = pointsForPosition(entry.position);

      current.totalPoints += pts;
      current.playedStages += 1;
      if (entry.position === 1) current.wins += 1;
      if (entry.position <= 3) current.podiums += 1;

      map.set(entry.player_id, current);
    }

    return [...map.values()].sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.podiums !== a.podiums) return b.podiums - a.podiums;
      return a.apelido.localeCompare(b.apelido);
    });
  }, [entries, stages, players]);

  const rankingStage = useMemo(() => {
    return stages.find((stage) => stage.id === selectedRankingStageId) || null;
  }, [stages, selectedRankingStageId]);

  const rankingStageEntries = useMemo(() => {
    if (!rankingStage) return [];
    return entries
      .filter((entry) => entry.stage_id === rankingStage.id)
      .filter((entry) => entry.position)
      .sort((a, b) => Number(a.position || 999) - Number(b.position || 999));
  }, [entries, rankingStage]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "ao_vivo", label: "Etapa ao vivo" },
    { key: "ranking_geral", label: "Ranking geral" },
    { key: "ranking_etapa", label: "Ranking por etapa" },
    { key: "blinds", label: "Blinds" },
    { key: "jogadores", label: "Jogadores" },
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

        {tab === "ao_vivo" && (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
              <h2 className="text-2xl font-bold text-white">
                {activeStage ? "Etapa em andamento" : "Próxima etapa"}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Acompanhe a etapa ativa, local, estrutura e jogadores participantes.
              </p>

              <div className="mt-6">
                {loading ? (
                  <p className="text-zinc-400">Carregando etapa...</p>
                ) : nextStage ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Evento
                      </div>
                      <div className="mt-2 text-lg font-bold text-white">
                        {nextStage.nome}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Data
                      </div>
                      <div className="mt-2 text-lg font-bold text-white">
                        {formatDateTime(nextStage.data_etapa)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Status
                      </div>
                      <div className="mt-2 text-lg font-bold text-white">
                        {stageStatusLabel(nextStage.status)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Local
                      </div>
                      <div className="mt-2 text-lg font-bold text-white">
                        {nextStage.local_nome || "Não informado"}
                      </div>
                      <div className="mt-1 text-sm text-zinc-500">
                        {nextStage.endereco || "Endereço não informado"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4 md:col-span-2 xl:col-span-2">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Estrutura de blinds
                      </div>
                      <div className="mt-2 text-lg font-bold text-white">
                        {activeBlindProfile?.nome || "Não informada"}
                      </div>
                      <div className="mt-1 text-sm text-zinc-500">
                        {activeBlindProfile
                          ? `${activeBlindProfile.minutos} min por nível`
                          : ""}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Buy-in
                      </div>
                      <div className="mt-2 text-lg font-bold text-white">
                        {formatMoney(nextStage.buy_in_default)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Rebuy / Add-on
                      </div>
                      <div className="mt-2 text-lg font-bold text-white">
                        {formatMoney(nextStage.rebuy_default)} /{" "}
                        {formatMoney(nextStage.addon_default)}
                      </div>
                    </div>

                    {nextStage.notes && (
                      <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4 md:col-span-2 xl:col-span-4">
                        <div className="text-xs uppercase tracking-wide text-zinc-500">
                          Observações
                        </div>
                        <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
                          {nextStage.notes}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-zinc-400">Nenhuma etapa cadastrada ainda.</p>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    Jogadores da etapa
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Participantes da etapa em andamento.
                  </p>
                </div>
                <span className="rounded-full border border-red-900 px-3 py-1 text-xs text-zinc-300">
                  {activeStageEntries.length} inscrito(s)
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {!activeStage && (
                  <p className="text-zinc-400">
                    Nenhuma etapa em andamento no momento.
                  </p>
                )}

                {activeStage &&
                  activeStageEntries.map((entry) => {
                    const player = getPlayerById(entry.player_id);
                    if (!player) return null;

                    return (
                      <div
                        key={entry.id}
                        className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="text-lg font-bold text-white">
                              {player.apelido}
                            </div>
                            <div className="text-sm text-zinc-400">
                              {player.nome}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 text-sm">
                            <span className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300">
                              {entry.eliminado ? "Eliminado" : "Jogando"}
                            </span>
                            <span className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300">
                              Rebuys: {Number(entry.rebuys || 0)}
                            </span>
                            <span className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300">
                              Add-on: {entry.addon ? "Sim" : "Não"}
                            </span>
                            {entry.position && (
                              <span className="rounded-full border border-red-800 px-3 py-1 text-red-300">
                                {entry.position}º lugar
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {activeStage && activeStageEntries.length === 0 && (
                  <p className="text-zinc-400">Nenhum jogador inscrito ainda.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "ranking_geral" && (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
              <h2 className="text-2xl font-bold text-white">Ranking geral</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Pontuação estilo Fórmula 1 considerando as etapas encerradas.
              </p>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-zinc-950/90">
                    <tr className="text-left text-sm text-zinc-400">
                      <th className="px-4 py-4">#</th>
                      <th className="px-4 py-4">Jogador</th>
                      <th className="px-4 py-4">Pontos</th>
                      <th className="px-4 py-4">Vitórias</th>
                      <th className="px-4 py-4">Pódios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overallRanking.map((row, index) => (
                      <tr
                        key={row.playerId}
                        className="border-t border-red-950 text-sm text-white"
                      >
                        <td className="px-4 py-4">{index + 1}</td>
                        <td className="px-4 py-4">
                          <div className="font-semibold">{row.apelido}</div>
                          <div className="text-xs text-zinc-500">{row.nome}</div>
                        </td>
                        <td className="px-4 py-4 font-bold">{row.totalPoints}</td>
                        <td className="px-4 py-4">{row.wins}</td>
                        <td className="px-4 py-4">{row.podiums}</td>
                      </tr>
                    ))}

                    {overallRanking.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                          Ainda não há etapas encerradas com posições definidas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
              <h3 className="text-xl font-bold text-white">Tabela de pontos</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {Object.entries(F1_POINTS).map(([position, points]) => (
                  <div
                    key={position}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                  >
                    <div className="text-xs text-zinc-500">{position}º lugar</div>
                    <div className="mt-1 text-lg font-bold text-white">
                      {points} pts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "ranking_etapa" && (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Ranking por etapa</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Resultado de uma etapa específica.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-300">Etapa</label>
                  <select
                    value={selectedRankingStageId}
                    onChange={(e) => setSelectedRankingStageId(e.target.value)}
                    className="min-w-[240px] rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  >
                    <option value="">Selecione uma etapa</option>
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-zinc-950/90">
                    <tr className="text-left text-sm text-zinc-400">
                      <th className="px-4 py-4">Pos.</th>
                      <th className="px-4 py-4">Jogador</th>
                      <th className="px-4 py-4">Pontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingStageEntries.map((entry) => {
                      const player = getPlayerById(entry.player_id);
                      if (!player) return null;

                      return (
                        <tr
                          key={entry.id}
                          className="border-t border-red-950 text-sm text-white"
                        >
                          <td className="px-4 py-4 font-bold">{entry.position}º</td>
                          <td className="px-4 py-4">
                            <div className="font-semibold">{player.apelido}</div>
                            <div className="text-xs text-zinc-500">{player.nome}</div>
                          </td>
                          <td className="px-4 py-4">
                            {pointsForPosition(entry.position)}
                          </td>
                        </tr>
                      );
                    })}

                    {rankingStageEntries.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                          Nenhuma posição salva para a etapa selecionada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {rankingStage && (
                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-400">
                  Etapa: <span className="font-semibold text-white">{rankingStage.nome}</span>
                  {" • "}
                  {stageStatusLabel(rankingStage.status)}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "blinds" && (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
              <h2 className="text-2xl font-bold text-white">Estruturas de blinds</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Consulte as estruturas cadastradas.
              </p>
            </div>

            <div className="space-y-4">
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

              {blindProfiles.length === 0 && (
                <div className="rounded-2xl border border-red-900 bg-black/80 p-4 text-zinc-500">
                  Nenhuma estrutura disponível ainda.
                </div>
              )}
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
              {sortedPlayers.map((player) => (
                <div
                  key={player.id}
                  className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4"
                >
                  <div className="text-lg font-bold text-white">{player.apelido}</div>
                  <div className="text-sm text-zinc-400">{player.nome}</div>
                  {player.pix && (
                    <div className="mt-1 text-sm text-zinc-500">PIX: {player.pix}</div>
                  )}
                </div>
              ))}

              {sortedPlayers.length === 0 && (
                <p className="text-zinc-400">Nenhum jogador cadastrado ainda.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}