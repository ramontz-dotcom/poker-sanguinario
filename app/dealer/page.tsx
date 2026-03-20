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

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function DealerPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("jogadores");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [pix, setPix] = useState("");

  const [blindProfiles, setBlindProfiles] = useState<BlindProfile[]>([]);
  const [blindProfileName, setBlindProfileName] = useState("");
  const [blindMinutes, setBlindMinutes] = useState(15);
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>([
    { id: makeId(), small: 25, big: 50 },
    { id: makeId(), small: 50, big: 100 },
    { id: makeId(), small: 75, big: 150 },
  ]);

  useEffect(() => {
    const mode = localStorage.getItem("poker_access_mode");

    if (mode !== "dealer") {
      router.push("/");
      return;
    }

    loadPlayers();

    const savedProfiles = localStorage.getItem("poker_blind_profiles");
    if (savedProfiles) {
      setBlindProfiles(JSON.parse(savedProfiles));
    }
  }, [router]);

  useEffect(() => {
    localStorage.setItem("poker_blind_profiles", JSON.stringify(blindProfiles));
  }, [blindProfiles]);

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

    setPlayers(data || []);
    setLoadingPlayers(false);
  }

  function handleLogout() {
    localStorage.removeItem("poker_access_mode");
    router.push("/");
  }

  async function addPlayer() {
    if (!nome.trim() || !apelido.trim()) return;

    const { error } = await supabase.from("players").insert([
      {
        nome: nome.trim(),
        apelido: apelido.trim(),
        pix: pix.trim() || null,
      },
    ]);

    if (error) {
      console.error("Erro ao adicionar jogador:", error);
      alert("Erro ao adicionar jogador.");
      return;
    }

    setNome("");
    setApelido("");
    setPix("");
    await loadPlayers();
  }

  async function removePlayer(playerId: string) {
    const { error } = await supabase.from("players").delete().eq("id", playerId);

    if (error) {
      console.error("Erro ao remover jogador:", error);
      alert("Erro ao remover jogador.");
      return;
    }

    await loadPlayers();
  }

  function addBlindLevel() {
    setBlindLevels((current) => [
      ...current,
      { id: makeId(), small: 0, big: 0 },
    ]);
  }

  function updateBlindLevel(
    levelId: string,
    field: keyof BlindLevel,
    value: number
  ) {
    setBlindLevels((current) =>
      current.map((level) =>
        level.id === levelId ? { ...level, [field]: value } : level
      )
    );
  }

  function removeBlindLevel(levelId: string) {
    setBlindLevels((current) => current.filter((level) => level.id !== levelId));
  }

  function saveBlindProfile() {
    if (!blindProfileName.trim() || blindLevels.length === 0) return;

    const newProfile: BlindProfile = {
      id: makeId(),
      nome: blindProfileName.trim(),
      minutos: Number(blindMinutes || 0),
      niveis: blindLevels.map((level) => ({
        id: level.id,
        small: Number(level.small || 0),
        big: Number(level.big || 0),
      })),
    };

    setBlindProfiles((current) => [newProfile, ...current]);
    setBlindProfileName("");
    setBlindMinutes(15);
    setBlindLevels([
      { id: makeId(), small: 25, big: 50 },
      { id: makeId(), small: 50, big: 100 },
      { id: makeId(), small: 75, big: 150 },
    ]);
  }

  function removeBlindProfile(profileId: string) {
    setBlindProfiles((current) =>
      current.filter((profile) => profile.id !== profileId)
    );
  }

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => a.apelido.localeCompare(b.apelido));
  }, [players]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "jogadores", label: "Jogadores" },
    { key: "ranking", label: "Ranking" },
    { key: "blinds", label: "Blinds" },
  ];

  return (
    <AppShell role="dealer" onLogout={handleLogout}>
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

        {tab === "jogadores" && (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
              <h2 className="text-2xl font-bold text-white">Cadastro de jogadores</h2>
              <p className="mt-2 text-sm text-zinc-400 sm:text-base">
                Jogadores salvos online no Supabase.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome"
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-700"
                />

                <input
                  value={apelido}
                  onChange={(e) => setApelido(e.target.value)}
                  placeholder="Apelido"
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-700"
                />

                <input
                  value={pix}
                  onChange={(e) => setPix(e.target.value)}
                  placeholder="PIX (opcional)"
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-700"
                />
              </div>

              <button
                onClick={addPlayer}
                className="mt-4 w-full rounded-2xl bg-red-700 px-5 py-3 font-bold text-white transition hover:bg-red-600 sm:w-auto"
              >
                Adicionar jogador
              </button>
            </div>

            <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-white">Jogadores cadastrados</h2>
                <span className="rounded-full border border-red-900 px-3 py-1 text-xs text-zinc-300">
                  {players.length} total
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {loadingPlayers && (
                  <p className="text-zinc-400">Carregando jogadores...</p>
                )}

                {!loadingPlayers && players.length === 0 && (
                  <p className="text-zinc-400">Nenhum jogador cadastrado ainda.</p>
                )}

                {!loadingPlayers &&
                  sortedPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
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

                        <button
                          onClick={() => removePlayer(player.id)}
                          className="rounded-xl border border-red-800 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-950/30"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {tab === "ranking" && (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
              <h2 className="text-2xl font-bold text-white">Ranking</h2>
              <p className="mt-2 text-sm text-zinc-400 sm:text-base">
                Base visual responsiva pronta. A lógica online de etapas e pontuação
                entra na próxima fase.
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
                        Cadastre jogadores para preparar a base do ranking.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {sortedPlayers.length === 0 && (
                <div className="rounded-2xl border border-red-900 bg-black/80 p-4 text-zinc-500">
                  Cadastre jogadores para preparar a base do ranking.
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

        {tab === "blinds" && (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
              <h2 className="text-2xl font-bold text-white">Cadastro de blinds</h2>
              <p className="mt-2 text-sm text-zinc-400 sm:text-base">
                Estruturas visuais responsivas prontas. Nesta fase, elas ainda ficam
                salvas no navegador do Dealer.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">
                    Nome da estrutura
                  </label>
                  <input
                    value={blindProfileName}
                    onChange={(e) => setBlindProfileName(e.target.value)}
                    placeholder="Ex.: Turbo 10 min"
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-300">
                    Minutos por blind
                  </label>
                  <input
                    type="number"
                    value={blindMinutes}
                    onChange={(e) => setBlindMinutes(Number(e.target.value || 0))}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {blindLevels.map((level, index) => (
                  <div
                    key={level.id}
                    className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4"
                  >
                    <div className="mb-3 text-sm font-semibold text-zinc-300">
                      Nível {index + 1}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
                      <input
                        type="number"
                        value={level.small}
                        onChange={(e) =>
                          updateBlindLevel(
                            level.id,
                            "small",
                            Number(e.target.value || 0)
                          )
                        }
                        placeholder="Small blind"
                        className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                      />

                      <input
                        type="number"
                        value={level.big}
                        onChange={(e) =>
                          updateBlindLevel(
                            level.id,
                            "big",
                            Number(e.target.value || 0)
                          )
                        }
                        placeholder="Big blind"
                        className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                      />

                      <button
                        onClick={() => removeBlindLevel(level.id)}
                        className="rounded-xl border border-red-800 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950/30"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={addBlindLevel}
                  className="rounded-2xl border border-red-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-950/30"
                >
                  Adicionar nível
                </button>

                <button
                  onClick={saveBlindProfile}
                  className="rounded-2xl bg-red-700 px-5 py-3 font-bold text-white transition hover:bg-red-600"
                >
                  Salvar estrutura
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-white">Estruturas cadastradas</h2>
                <span className="rounded-full border border-red-900 px-3 py-1 text-xs text-zinc-300">
                  {blindProfiles.length} total
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {blindProfiles.length === 0 && (
                  <p className="text-zinc-400">Nenhuma estrutura cadastrada ainda.</p>
                )}

                {blindProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-lg font-bold text-red-400">
                          {profile.nome}
                        </div>
                        <div className="text-sm text-zinc-500">
                          {profile.minutos} min por nível
                        </div>
                      </div>

                      <button
                        onClick={() => removeBlindProfile(profile.id)}
                        className="rounded-xl border border-red-800 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-950/30"
                      >
                        Remover
                      </button>
                    </div>

                    <div className="mt-4 space-y-2">
                      {profile.niveis.map((level, index) => (
                        <div
                          key={level.id}
                          className="flex items-center justify-between rounded-xl border border-red-950 bg-black/40 px-4 py-3 text-sm"
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
          </div>
        )}
      </div>
    </AppShell>
  );
}