"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";

type Tab = "jogadores" | "ranking" | "etapas" | "financeiro" | "blinds";

type Player = {
  id: string;
  nome: string;
  apelido: string;
  pix: string;
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

type StageEntry = {
  playerId: string;
  present: boolean;
  buyIn: number;
  rebuys: number;
  rebuyValue: number;
  addon: boolean;
  addonValue: number;
  drink: boolean;
  food: boolean;
  position: number | null;
};

type StagePayout = {
  first: number;
  second: number;
  third: number;
  fourth: number;
  extra: number;
};

type Stage = {
  id: string;
  nome: string;
  data: string;
  notes: string;
  drinkCost: number;
  foodCost: number;
  adminFee: number;
  blindProfileId: string;
  isClosed: boolean;
  payouts: StagePayout;
  entries: StageEntry[];
};

const DEFAULT_BUY_IN = 60;
const DEFAULT_REBUY_VALUE = 40;
const DEFAULT_ADDON_VALUE = 40;
const POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const defaultBlindProfile: BlindProfile = {
  id: makeId(),
  nome: "Padrão 15 min",
  minutos: 15,
  niveis: [
    { id: makeId(), small: 25, big: 50 },
    { id: makeId(), small: 50, big: 100 },
    { id: makeId(), small: 75, big: 150 },
    { id: makeId(), small: 100, big: 200 },
    { id: makeId(), small: 150, big: 300 },
    { id: makeId(), small: 200, big: 400 },
    { id: makeId(), small: 250, big: 500 },
    { id: makeId(), small: 300, big: 600 },
  ],
};

export default function DealerPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("jogadores");

  const [players, setPlayers] = useState<Player[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [blindProfiles, setBlindProfiles] = useState<BlindProfile[]>([]);

  const [selectedStageId, setSelectedStageId] = useState("");
  const [selectedBlindProfileId, setSelectedBlindProfileId] = useState("");

  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [pix, setPix] = useState("");

  const [stageName, setStageName] = useState("");
  const [stageDate, setStageDate] = useState("");
  const [stageNotes, setStageNotes] = useState("");

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

    const savedPlayers = localStorage.getItem("poker_players");
    const savedStages = localStorage.getItem("poker_stages");
    const savedBlinds = localStorage.getItem("poker_blind_profiles");

    if (savedPlayers) {
      setPlayers(JSON.parse(savedPlayers));
    }

    if (savedStages) {
      const parsedStages: Stage[] = JSON.parse(savedStages);
      setStages(parsedStages);
      if (parsedStages.length > 0) {
        setSelectedStageId(parsedStages[0].id);
      }
    }

    if (savedBlinds) {
      const parsedBlinds: BlindProfile[] = JSON.parse(savedBlinds);
      setBlindProfiles(parsedBlinds);
      if (parsedBlinds.length > 0) {
        setSelectedBlindProfileId(parsedBlinds[0].id);
      }
    } else {
      setBlindProfiles([defaultBlindProfile]);
      setSelectedBlindProfileId(defaultBlindProfile.id);
    }
  }, [router]);

  useEffect(() => {
    localStorage.setItem("poker_players", JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem("poker_stages", JSON.stringify(stages));
  }, [stages]);

  useEffect(() => {
    localStorage.setItem("poker_blind_profiles", JSON.stringify(blindProfiles));
  }, [blindProfiles]);

  function handleLogout() {
    localStorage.removeItem("poker_access_mode");
    router.push("/");
  }

  function addPlayer() {
    if (!nome.trim() || !apelido.trim()) return;

    const newPlayer: Player = {
      id: makeId(),
      nome: nome.trim(),
      apelido: apelido.trim(),
      pix: pix.trim(),
    };

    setPlayers((current) => [...current, newPlayer]);
    setNome("");
    setApelido("");
    setPix("");
  }

  function removePlayer(playerId: string) {
    setPlayers((current) => current.filter((p) => p.id !== playerId));

    setStages((current) =>
      current.map((stage) => ({
        ...stage,
        entries: stage.entries.filter((entry) => entry.playerId !== playerId),
      }))
    );
  }

  function createDefaultEntry(playerId: string): StageEntry {
    return {
      playerId,
      present: false,
      buyIn: DEFAULT_BUY_IN,
      rebuys: 0,
      rebuyValue: DEFAULT_REBUY_VALUE,
      addon: false,
      addonValue: DEFAULT_ADDON_VALUE,
      drink: false,
      food: false,
      position: null,
    };
  }

  function addStage() {
    if (!stageName.trim() || !stageDate) return;

    const newStage: Stage = {
      id: makeId(),
      nome: stageName.trim(),
      data: stageDate,
      notes: stageNotes.trim(),
      drinkCost: 0,
      foodCost: 0,
      adminFee: 0,
      blindProfileId: selectedBlindProfileId || "",
      isClosed: false,
      payouts: {
        first: 0,
        second: 0,
        third: 0,
        fourth: 0,
        extra: 0,
      },
      entries: players.map((player) => createDefaultEntry(player.id)),
    };

    setStages((current) => [newStage, ...current]);
    setSelectedStageId(newStage.id);
    setStageName("");
    setStageDate("");
    setStageNotes("");
    setTab("etapas");
  }

  function removeStage(stageId: string) {
    const updated = stages.filter((stage) => stage.id !== stageId);
    setStages(updated);
    setSelectedStageId(updated[0]?.id || "");
  }

  function updateStageField<K extends keyof Stage>(
    stageId: string,
    field: K,
    value: Stage[K]
  ) {
    setStages((current) =>
      current.map((stage) =>
        stage.id === stageId ? { ...stage, [field]: value } : stage
      )
    );
  }

  function updateStagePayout(
    stageId: string,
    field: keyof StagePayout,
    value: number
  ) {
    setStages((current) =>
      current.map((stage) =>
        stage.id === stageId
          ? { ...stage, payouts: { ...stage.payouts, [field]: value } }
          : stage
      )
    );
  }

  function updateStageEntry(
    stageId: string,
    playerId: string,
    field: keyof StageEntry,
    value: StageEntry[keyof StageEntry]
  ) {
    setStages((current) =>
      current.map((stage) => {
        if (stage.id !== stageId) return stage;

        return {
          ...stage,
          entries: stage.entries.map((entry) =>
            entry.playerId === playerId ? { ...entry, [field]: value } : entry
          ),
        };
      })
    );
  }

  function syncPlayersToStage(stageId: string) {
    setStages((current) =>
      current.map((stage) => {
        if (stage.id !== stageId) return stage;

        const existingIds = new Set(stage.entries.map((entry) => entry.playerId));
        const missingEntries = players
          .filter((player) => !existingIds.has(player.id))
          .map((player) => createDefaultEntry(player.id));

        return {
          ...stage,
          entries: [...stage.entries, ...missingEntries],
        };
      })
    );
  }

  function addBlindLevel() {
    setBlindLevels((current) => [
      ...current,
      { id: makeId(), small: 0, big: 0 },
    ]);
  }

  function updateBlindLevel(levelId: string, field: keyof BlindLevel, value: number) {
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

    const profile: BlindProfile = {
      id: makeId(),
      nome: blindProfileName.trim(),
      minutos: Number(blindMinutes || 0),
      niveis: blindLevels.map((level) => ({
        id: level.id,
        small: Number(level.small || 0),
        big: Number(level.big || 0),
      })),
    };

    setBlindProfiles((current) => [profile, ...current]);
    setSelectedBlindProfileId(profile.id);
    setBlindProfileName("");
    setBlindMinutes(15);
    setBlindLevels([
      { id: makeId(), small: 25, big: 50 },
      { id: makeId(), small: 50, big: 100 },
      { id: makeId(), small: 75, big: 150 },
    ]);
  }

  function removeBlindProfile(profileId: string) {
    const updated = blindProfiles.filter((profile) => profile.id !== profileId);
    setBlindProfiles(updated);
    setSelectedBlindProfileId(updated[0]?.id || "");

    setStages((current) =>
      current.map((stage) =>
        stage.blindProfileId === profileId
          ? { ...stage, blindProfileId: updated[0]?.id || "" }
          : stage
      )
    );
  }

  const selectedStage = useMemo(
    () => stages.find((stage) => stage.id === selectedStageId) || null,
    [stages, selectedStageId]
  );

  const selectedBlindProfile = useMemo(
    () =>
      blindProfiles.find((profile) => profile.id === selectedBlindProfileId) || null,
    [blindProfiles, selectedBlindProfileId]
  );

  const ranking = useMemo(() => {
    return players
      .map((player) => {
        let pontos = 0;
        let primeiro = 0;
        let segundo = 0;
        let terceiro = 0;
        let presencas = 0;

        stages.forEach((stage) => {
          const entry = stage.entries.find((e) => e.playerId === player.id);
          if (!entry) return;

          if (entry.present) presencas += 1;
          if (entry.position && entry.position >= 1 && entry.position <= 10) {
            pontos += POINTS_TABLE[entry.position - 1] || 0;
          }
          if (entry.position === 1) primeiro += 1;
          if (entry.position === 2) segundo += 1;
          if (entry.position === 3) terceiro += 1;
        });

        return {
          ...player,
          pontos,
          primeiro,
          segundo,
          terceiro,
          presencas,
        };
      })
      .sort((a, b) => {
        if (b.pontos !== a.pontos) return b.pontos - a.pontos;
        if (b.primeiro !== a.primeiro) return b.primeiro - a.primeiro;
        if (b.segundo !== a.segundo) return b.segundo - a.segundo;
        if (b.terceiro !== a.terceiro) return b.terceiro - a.terceiro;
        return a.apelido.localeCompare(b.apelido);
      });
  }, [players, stages]);

  const selectedStageFinance = useMemo(() => {
    if (!selectedStage) {
      return {
        pokerTotal: 0,
        drinkParticipants: 0,
        foodParticipants: 0,
        drinkShare: 0,
        foodShare: 0,
        prizeBase: 0,
        payoutConfigured: 0,
        payoutDifference: 0,
      };
    }

    const pokerTotal = selectedStage.entries.reduce((sum, entry) => {
      if (!entry.present) return sum;
      return (
        sum +
        Number(entry.buyIn || 0) +
        Number(entry.rebuys || 0) * Number(entry.rebuyValue || 0) +
        (entry.addon ? Number(entry.addonValue || 0) : 0)
      );
    }, 0);

    const drinkParticipants = selectedStage.entries.filter((e) => e.drink).length;
    const foodParticipants = selectedStage.entries.filter((e) => e.food).length;

    const drinkShare =
      drinkParticipants > 0
        ? Number(selectedStage.drinkCost || 0) / drinkParticipants
        : 0;

    const foodShare =
      foodParticipants > 0
        ? Number(selectedStage.foodCost || 0) / foodParticipants
        : 0;

    const prizeBase = pokerTotal - Number(selectedStage.adminFee || 0);

    const payoutConfigured =
      Number(selectedStage.payouts.first || 0) +
      Number(selectedStage.payouts.second || 0) +
      Number(selectedStage.payouts.third || 0) +
      Number(selectedStage.payouts.fourth || 0) +
      Number(selectedStage.payouts.extra || 0);

    const payoutDifference = prizeBase - payoutConfigured;

    return {
      pokerTotal,
      drinkParticipants,
      foodParticipants,
      drinkShare,
      foodShare,
      prizeBase,
      payoutConfigured,
      payoutDifference,
    };
  }, [selectedStage]);

  return (
    <AppShell role="dealer" onLogout={handleLogout}>
      <div className="space-y-6">
        <div className="grid grid-cols-5 gap-2 rounded-2xl border border-red-900 bg-black/60 p-2">
          {[
            { key: "jogadores", label: "Jogadores" },
            { key: "ranking", label: "Ranking" },
            { key: "etapas", label: "Etapas" },
            { key: "financeiro", label: "Financeiro" },
            { key: "blinds", label: "Blinds" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key as Tab)}
              className={`rounded-xl px-4 py-3 font-semibold transition ${
                tab === item.key
                  ? "bg-red-700 text-white"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "jogadores" && (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-red-800 bg-black/80 p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-white">Cadastro de jogadores</h2>
              <p className="mt-2 text-zinc-400">
                Adicione nome, apelido e pix dos participantes da liga.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome"
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-700"
                />
                <input
                  value={apelido}
                  onChange={(e) => setApelido(e.target.value)}
                  placeholder="Apelido"
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-700"
                />
                <input
                  value={pix}
                  onChange={(e) => setPix(e.target.value)}
                  placeholder="PIX (opcional)"
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-700"
                />
              </div>

              <button
                onClick={addPlayer}
                className="mt-4 rounded-xl bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-600"
              >
                Adicionar jogador
              </button>
            </div>

            <div className="rounded-[28px] border border-red-800 bg-black/80 p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-white">Jogadores cadastrados</h2>

              <div className="mt-6 space-y-3">
                {players.length === 0 && (
                  <p className="text-zinc-400">Nenhum jogador cadastrado ainda.</p>
                )}

                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-2xl border border-red-900 bg-zinc-950/60 px-4 py-4"
                  >
                    <div>
                      <div className="font-bold text-white">
                        {player.apelido}{" "}
                        <span className="font-normal text-zinc-400">
                          ({player.nome})
                        </span>
                      </div>
                      {player.pix && (
                        <div className="mt-1 text-sm text-zinc-500">
                          PIX: {player.pix}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removePlayer(player.id)}
                      className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-400 hover:bg-red-950/30"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "ranking" && (
          <div className="rounded-[28px] border border-red-800 bg-black/80 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Ranking geral</h2>
              <span className="text-sm text-zinc-500">Pontuação estilo Fórmula 1</span>
            </div>

            <div className="mt-6 overflow-x-auto rounded-2xl border border-red-900">
              <table className="min-w-full">
                <thead className="bg-zinc-950/90">
                  <tr className="text-left text-sm text-zinc-400">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Apelido</th>
                    <th className="px-4 py-3">Pontos</th>
                    <th className="px-4 py-3">🥇</th>
                    <th className="px-4 py-3">🥈</th>
                    <th className="px-4 py-3">🥉</th>
                    <th className="px-4 py-3">Presenças</th>
                  </tr>
                </thead>

                <tbody>
                  {ranking.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                        Cadastre jogadores e etapas para gerar o ranking.
                      </td>
                    </tr>
                  )}

                  {ranking.map((player, index) => (
                    <tr
                      key={player.id}
                      className="border-t border-red-950 text-sm text-white"
                    >
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold">{player.apelido}</td>
                      <td className="px-4 py-3">{player.pontos}</td>
                      <td className="px-4 py-3">{player.primeiro}</td>
                      <td className="px-4 py-3">{player.segundo}</td>
                      <td className="px-4 py-3">{player.terceiro}</td>
                      <td className="px-4 py-3">{player.presencas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "etapas" && (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-red-800 bg-black/80 p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-white">Criar etapa</h2>
              <p className="mt-2 text-zinc-400">
                Crie uma rodada e depois lance a participação de cada jogador.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">Nome da etapa</label>
                  <input
                    value={stageName}
                    onChange={(e) => setStageName(e.target.value)}
                    placeholder="Nome da etapa"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-700"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-300">Data</label>
                  <input
                    type="date"
                    value={stageDate}
                    onChange={(e) => setStageDate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-700"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-300">Observações</label>
                  <input
                    value={stageNotes}
                    onChange={(e) => setStageNotes(e.target.value)}
                    placeholder="Observações"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-700"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm text-zinc-300">Estrutura de blind</label>
                <select
                  value={selectedBlindProfileId}
                  onChange={(e) => setSelectedBlindProfileId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                >
                  <option value="">Selecione uma estrutura</option>
                  {blindProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.nome} · {profile.minutos} min
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={addStage}
                className="mt-4 rounded-xl bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-600"
              >
                Criar etapa
              </button>
            </div>

            <div className="rounded-[28px] border border-red-800 bg-black/80 p-6 shadow-2xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Lançamento da etapa</h2>
                  <p className="mt-2 text-zinc-400">
                    Lance valores, participação e posição final de todos os jogadores.
                  </p>
                </div>

                <div className="flex gap-3">
                  <div>
                    <label className="mb-2 block text-sm text-zinc-300">Etapa</label>
                    <select
                      value={selectedStageId}
                      onChange={(e) => setSelectedStageId(e.target.value)}
                      className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                    >
                      <option value="">Selecione a etapa</option>
                      {stages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.nome} - {stage.data}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedStage && (
                    <button
                      onClick={() => removeStage(selectedStage.id)}
                      className="rounded-xl border border-red-800 px-4 py-3 text-sm text-red-400 hover:bg-red-950/30"
                    >
                      Excluir etapa
                    </button>
                  )}
                </div>
              </div>

              {!selectedStage && (
                <p className="mt-6 text-zinc-500">
                  Crie ou selecione uma etapa para lançar os dados.
                </p>
              )}

              {selectedStage && (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div>
                      <label className="mb-2 block text-sm text-zinc-300">Total bebida</label>
                      <input
                        type="number"
                        value={selectedStage.drinkCost}
                        onChange={(e) =>
                          updateStageField(
                            selectedStage.id,
                            "drinkCost",
                            Number(e.target.value || 0)
                          )
                        }
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-300">Total comida</label>
                      <input
                        type="number"
                        value={selectedStage.foodCost}
                        onChange={(e) =>
                          updateStageField(
                            selectedStage.id,
                            "foodCost",
                            Number(e.target.value || 0)
                          )
                        }
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-300">Taxa administrativa</label>
                      <input
                        type="number"
                        value={selectedStage.adminFee}
                        onChange={(e) =>
                          updateStageField(
                            selectedStage.id,
                            "adminFee",
                            Number(e.target.value || 0)
                          )
                        }
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-zinc-300">Blind da etapa</label>
                      <select
                        value={selectedStage.blindProfileId}
                        onChange={(e) =>
                          updateStageField(selectedStage.id, "blindProfileId", e.target.value)
                        }
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                      >
                        <option value="">Selecione</option>
                        {blindProfiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => syncPlayersToStage(selectedStage.id)}
                      className="rounded-xl border border-red-800 px-4 py-3 text-sm text-white hover:bg-red-950/30"
                    >
                      Buscar / incluir jogadores
                    </button>

                    <button
                      onClick={() =>
                        updateStageField(selectedStage.id, "isClosed", !selectedStage.isClosed)
                      }
                      className="rounded-xl border border-red-800 px-4 py-3 text-sm text-white hover:bg-red-950/30"
                    >
                      {selectedStage.isClosed ? "Reabrir lançamento" : "Fechar lançamento"}
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-red-900">
                    <table className="min-w-full">
                      <thead className="bg-zinc-950/90">
                        <tr className="text-left text-sm text-zinc-400">
                          <th className="px-3 py-3">Jogador</th>
                          <th className="px-3 py-3">Presença</th>
                          <th className="px-3 py-3">Buy-in</th>
                          <th className="px-3 py-3">Rebuys</th>
                          <th className="px-3 py-3">R$ Rebuy</th>
                          <th className="px-3 py-3">Add-on</th>
                          <th className="px-3 py-3">R$ Add-on</th>
                          <th className="px-3 py-3">Bebida</th>
                          <th className="px-3 py-3">Comida</th>
                          <th className="px-3 py-3">Posição final</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStage.entries.map((entry) => {
                          const player = players.find((p) => p.id === entry.playerId);
                          if (!player) return null;

                          return (
                            <tr
                              key={entry.playerId}
                              className="border-t border-red-950 text-sm text-white"
                            >
                              <td className="px-3 py-3 font-semibold">{player.apelido}</td>

                              <td className="px-3 py-3">
                                <input
                                  type="checkbox"
                                  checked={entry.present}
                                  disabled={selectedStage.isClosed}
                                  onChange={(e) =>
                                    updateStageEntry(
                                      selectedStage.id,
                                      entry.playerId,
                                      "present",
                                      e.target.checked
                                    )
                                  }
                                />
                              </td>

                              <td className="px-3 py-3">
                                <input
                                  type="number"
                                  value={entry.buyIn}
                                  disabled={selectedStage.isClosed}
                                  onChange={(e) =>
                                    updateStageEntry(
                                      selectedStage.id,
                                      entry.playerId,
                                      "buyIn",
                                      Number(e.target.value || 0)
                                    )
                                  }
                                  className="w-24 rounded-lg bg-zinc-950 px-2 py-2"
                                />
                              </td>

                              <td className="px-3 py-3">
                                <input
                                  type="number"
                                  value={entry.rebuys}
                                  disabled={selectedStage.isClosed}
                                  onChange={(e) =>
                                    updateStageEntry(
                                      selectedStage.id,
                                      entry.playerId,
                                      "rebuys",
                                      Number(e.target.value || 0)
                                    )
                                  }
                                  className="w-20 rounded-lg bg-zinc-950 px-2 py-2"
                                />
                              </td>

                              <td className="px-3 py-3">
                                <input
                                  type="number"
                                  value={entry.rebuyValue}
                                  disabled={selectedStage.isClosed}
                                  onChange={(e) =>
                                    updateStageEntry(
                                      selectedStage.id,
                                      entry.playerId,
                                      "rebuyValue",
                                      Number(e.target.value || 0)
                                    )
                                  }
                                  className="w-24 rounded-lg bg-zinc-950 px-2 py-2"
                                />
                              </td>

                              <td className="px-3 py-3">
                                <input
                                  type="checkbox"
                                  checked={entry.addon}
                                  disabled={selectedStage.isClosed}
                                  onChange={(e) =>
                                    updateStageEntry(
                                      selectedStage.id,
                                      entry.playerId,
                                      "addon",
                                      e.target.checked
                                    )
                                  }
                                />
                              </td>

                              <td className="px-3 py-3">
                                <input
                                  type="number"
                                  value={entry.addonValue}
                                  disabled={selectedStage.isClosed}
                                  onChange={(e) =>
                                    updateStageEntry(
                                      selectedStage.id,
                                      entry.playerId,
                                      "addonValue",
                                      Number(e.target.value || 0)
                                    )
                                  }
                                  className="w-24 rounded-lg bg-zinc-950 px-2 py-2"
                                />
                              </td>

                              <td className="px-3 py-3">
                                <input
                                  type="checkbox"
                                  checked={entry.drink}
                                  disabled={selectedStage.isClosed}
                                  onChange={(e) =>
                                    updateStageEntry(
                                      selectedStage.id,
                                      entry.playerId,
                                      "drink",
                                      e.target.checked
                                    )
                                  }
                                />
                              </td>

                              <td className="px-3 py-3">
                                <input
                                  type="checkbox"
                                  checked={entry.food}
                                  disabled={selectedStage.isClosed}
                                  onChange={(e) =>
                                    updateStageEntry(
                                      selectedStage.id,
                                      entry.playerId,
                                      "food",
                                      e.target.checked
                                    )
                                  }
                                />
                              </td>

                              <td className="px-3 py-3">
                                <select
                                  value={entry.position ?? ""}
                                  disabled={selectedStage.isClosed}
                                  onChange={(e) =>
                                    updateStageEntry(
                                      selectedStage.id,
                                      entry.playerId,
                                      "position",
                                      e.target.value ? Number(e.target.value) : null
                                    )
                                  }
                                  className="w-24 rounded-lg bg-zinc-950 px-2 py-2"
                                >
                                  <option value="">-</option>
                                  {Array.from({ length: 20 }, (_, i) => i + 1).map((pos) => (
                                    <option key={pos} value={pos}>
                                      {pos}º
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {selectedStage.notes && (
                    <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4 text-sm text-zinc-400">
                      Observações: {selectedStage.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "financeiro" && (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-red-800 bg-black/80 p-6 shadow-2xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h2 className="text-2xl font-bold text-white">Financeiro e premiação</h2>

                <select
                  value={selectedStageId}
                  onChange={(e) => setSelectedStageId(e.target.value)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                >
                  <option value="">Selecione a etapa</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.nome} - {stage.data}
                    </option>
                  ))}
                </select>
              </div>

              {!selectedStage && (
                <p className="mt-6 text-zinc-500">
                  Selecione uma etapa para ver o resumo financeiro.
                </p>
              )}

              {selectedStage && (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-6">
                      <h3 className="text-2xl font-bold text-white">Resumo do poker</h3>

                      <div className="mt-6 space-y-4">
                        <div className="flex items-center justify-between rounded-xl bg-red-950/40 px-4 py-4">
                          <span>Total do poker</span>
                          <strong>{money(selectedStageFinance.pokerTotal)}</strong>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-red-950/40 px-4 py-4">
                          <span>Taxa administrativa</span>
                          <strong>{money(Number(selectedStage.adminFee || 0))}</strong>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-red-950/40 px-4 py-4">
                          <span>Base da premiação</span>
                          <strong>{money(selectedStageFinance.prizeBase)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-6">
                      <h3 className="text-2xl font-bold text-white">Confraternização</h3>

                      <div className="mt-6 space-y-4">
                        <div className="flex items-center justify-between rounded-xl bg-red-950/40 px-4 py-4">
                          <span>Bebida</span>
                          <strong>{money(Number(selectedStage.drinkCost || 0))}</strong>
                        </div>
                        <div className="text-sm text-zinc-400">
                          {selectedStageFinance.drinkParticipants} participantes ·{" "}
                          {money(selectedStageFinance.drinkShare)} por pessoa
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-red-950/40 px-4 py-4">
                          <span>Comida</span>
                          <strong>{money(Number(selectedStage.foodCost || 0))}</strong>
                        </div>
                        <div className="text-sm text-zinc-400">
                          {selectedStageFinance.foodParticipants} participantes ·{" "}
                          {money(selectedStageFinance.foodShare)} por pessoa
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-6">
                    <h3 className="text-2xl font-bold text-white">Divisão aberta da rodada</h3>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">1º lugar</label>
                        <input
                          type="number"
                          value={selectedStage.payouts.first}
                          onChange={(e) =>
                            updateStagePayout(selectedStage.id, "first", Number(e.target.value || 0))
                          }
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">2º lugar</label>
                        <input
                          type="number"
                          value={selectedStage.payouts.second}
                          onChange={(e) =>
                            updateStagePayout(selectedStage.id, "second", Number(e.target.value || 0))
                          }
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">3º lugar</label>
                        <input
                          type="number"
                          value={selectedStage.payouts.third}
                          onChange={(e) =>
                            updateStagePayout(selectedStage.id, "third", Number(e.target.value || 0))
                          }
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">4º lugar</label>
                        <input
                          type="number"
                          value={selectedStage.payouts.fourth}
                          onChange={(e) =>
                            updateStagePayout(selectedStage.id, "fourth", Number(e.target.value || 0))
                          }
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">Extra / acordo</label>
                        <input
                          type="number"
                          value={selectedStage.payouts.extra}
                          onChange={(e) =>
                            updateStagePayout(selectedStage.id, "extra", Number(e.target.value || 0))
                          }
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-zinc-300">
                          Observação de acordo
                        </label>
                        <input
                          value={selectedStage.notes}
                          onChange={(e) =>
                            updateStageField(selectedStage.id, "notes", e.target.value)
                          }
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                        />
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl bg-red-950/40 px-4 py-4">
                        <div className="text-sm text-zinc-300">Base da premiação</div>
                        <div className="mt-2 text-xl font-bold text-white">
                          {money(selectedStageFinance.prizeBase)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-red-950/40 px-4 py-4">
                        <div className="text-sm text-zinc-300">Total configurado</div>
                        <div className="mt-2 text-xl font-bold text-white">
                          {money(selectedStageFinance.payoutConfigured)}
                        </div>
                      </div>

                      <div className="rounded-xl bg-red-950/40 px-4 py-4">
                        <div className="text-sm text-zinc-300">Diferença</div>
                        <div
                          className={`mt-2 text-xl font-bold ${
                            selectedStageFinance.payoutDifference === 0
                              ? "text-green-400"
                              : "text-yellow-300"
                          }`}
                        >
                          {money(selectedStageFinance.payoutDifference)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "blinds" && (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-red-800 bg-black/80 p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-white">Cadastro de blinds</h2>
              <p className="mt-2 text-zinc-400">
                Cadastre estruturas de blind para o Player apenas selecionar e executar.
              </p>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-zinc-300">Nome da estrutura</label>
                  <input
                    value={blindProfileName}
                    onChange={(e) => setBlindProfileName(e.target.value)}
                    placeholder="Ex.: Turbo 10 min"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
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
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {blindLevels.map((level, index) => (
                  <div
                    key={level.id}
                    className="grid gap-3 rounded-2xl border border-red-900 bg-zinc-950/60 p-4 md:grid-cols-[120px_1fr_1fr_120px]"
                  >
                    <div className="flex items-center text-sm text-zinc-400">
                      Nível {index + 1}
                    </div>

                    <input
                      type="number"
                      value={level.small}
                      onChange={(e) =>
                        updateBlindLevel(level.id, "small", Number(e.target.value || 0))
                      }
                      placeholder="Small blind"
                      className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                    />

                    <input
                      type="number"
                      value={level.big}
                      onChange={(e) =>
                        updateBlindLevel(level.id, "big", Number(e.target.value || 0))
                      }
                      placeholder="Big blind"
                      className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                    />

                    <button
                      onClick={() => removeBlindLevel(level.id)}
                      className="rounded-xl border border-red-800 px-4 py-3 text-sm text-red-400 hover:bg-red-950/30"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={addBlindLevel}
                  className="rounded-xl border border-red-800 px-4 py-3 text-sm text-white hover:bg-red-950/30"
                >
                  Adicionar nível
                </button>

                <button
                  onClick={saveBlindProfile}
                  className="rounded-xl bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-600"
                >
                  Salvar estrutura
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-red-800 bg-black/80 p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-white">Estruturas cadastradas</h2>

              <div className="mt-6 space-y-4">
                {blindProfiles.length === 0 && (
                  <p className="text-zinc-400">Nenhuma estrutura cadastrada.</p>
                )}

                {blindProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="rounded-2xl border border-red-900 bg-zinc-950/60 p-5"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-lg font-bold text-red-400">
                          {profile.nome}
                        </div>
                        <div className="mt-1 text-sm text-zinc-500">
                          {profile.minutos} min por nível · {profile.niveis.length} níveis
                        </div>
                      </div>

                      <button
                        onClick={() => removeBlindProfile(profile.id)}
                        className="rounded-xl border border-red-800 px-4 py-3 text-sm text-red-400 hover:bg-red-950/30"
                      >
                        Remover
                      </button>
                    </div>

                    <div className="mt-4 overflow-x-auto rounded-2xl border border-red-950">
                      <table className="min-w-full">
                        <thead className="bg-zinc-950/90">
                          <tr className="text-left text-sm text-zinc-400">
                            <th className="px-4 py-3">Nível</th>
                            <th className="px-4 py-3">Small</th>
                            <th className="px-4 py-3">Big</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.niveis.map((level, index) => (
                            <tr
                              key={level.id}
                              className="border-t border-red-950 text-sm text-white"
                            >
                              <td className="px-4 py-3">{index + 1}</td>
                              <td className="px-4 py-3">{level.small}</td>
                              <td className="px-4 py-3">{level.big}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              {selectedBlindProfile && (
                <div className="mt-6 rounded-2xl border border-red-900 bg-zinc-950/60 p-4 text-sm text-zinc-400">
                  Estrutura selecionada para novas etapas:{" "}
                  <span className="font-semibold text-white">
                    {selectedBlindProfile.nome}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}