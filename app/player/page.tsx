"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";

type Tab = "ranking" | "etapas" | "financeiro" | "blinds";

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

const POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function PlayerPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("ranking");
  const [players, setPlayers] = useState<Player[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [blindProfiles, setBlindProfiles] = useState<BlindProfile[]>([]);
  const [selectedStageId, setSelectedStageId] = useState("");
  const [selectedBlindProfileId, setSelectedBlindProfileId] = useState("");

  useEffect(() => {
    const mode = localStorage.getItem("poker_access_mode");

    if (mode !== "player") {
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
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("poker_access_mode");
    router.push("/");
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
    <AppShell role="player" onLogout={handleLogout}>
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-2 rounded-2xl border border-red-900 bg-black/60 p-2">
          {[
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

        {tab === "ranking" && (
          <div className="rounded-[28px] border border-red-800 bg-black/80 p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white">Ranking geral</h2>

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
          <div className="rounded-[28px] border border-red-800 bg-black/80 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Resultados das etapas</h2>

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
              <p className="mt-6 text-zinc-500">Selecione uma etapa para visualizar.</p>
            )}

            {selectedStage && (
              <div className="mt-6 space-y-6">
                <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-5">
                  <div className="text-xl font-bold text-red-400">{selectedStage.nome}</div>
                  <div className="mt-1 text-sm text-zinc-500">{selectedStage.data}</div>
                  {selectedStage.notes && (
                    <div className="mt-3 text-sm text-zinc-400">
                      Observações: {selectedStage.notes}
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto rounded-2xl border border-red-900">
                  <table className="min-w-full">
                    <thead className="bg-zinc-950/90">
                      <tr className="text-left text-sm text-zinc-400">
                        <th className="px-4 py-3">Posição</th>
                        <th className="px-4 py-3">Jogador</th>
                        <th className="px-4 py-3">Buy-in</th>
                        <th className="px-4 py-3">Rebuys</th>
                        <th className="px-4 py-3">Add-on</th>
                        <th className="px-4 py-3">Bebida</th>
                        <th className="px-4 py-3">Comida</th>
                      </tr>
                    </thead>

                    <tbody>
                      {[...selectedStage.entries]
                        .filter((entry) => entry.present)
                        .sort((a, b) => {
                          const posA = a.position ?? 999;
                          const posB = b.position ?? 999;
                          return posA - posB;
                        })
                        .map((entry) => {
                          const player = players.find((p) => p.id === entry.playerId);
                          if (!player) return null;

                          return (
                            <tr
                              key={entry.playerId}
                              className="border-t border-red-950 text-sm text-white"
                            >
                              <td className="px-4 py-3">{entry.position ?? "-"}</td>
                              <td className="px-4 py-3 font-semibold">{player.apelido}</td>
                              <td className="px-4 py-3">{money(entry.buyIn)}</td>
                              <td className="px-4 py-3">
                                {entry.rebuys} × {money(entry.rebuyValue)}
                              </td>
                              <td className="px-4 py-3">
                                {entry.addon ? money(entry.addonValue) : "-"}
                              </td>
                              <td className="px-4 py-3">{entry.drink ? "Sim" : "-"}</td>
                              <td className="px-4 py-3">{entry.food ? "Sim" : "-"}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "financeiro" && (
          <div className="rounded-[28px] border border-red-800 bg-black/80 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
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
              <p className="mt-6 text-zinc-500">Selecione uma etapa para visualizar.</p>
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
                  <h3 className="text-2xl font-bold text-white">Premiação configurada</h3>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl bg-red-950/40 px-4 py-4">
                      <div className="text-sm text-zinc-300">1º lugar</div>
                      <div className="mt-2 text-xl font-bold text-white">
                        {money(selectedStage.payouts.first)}
                      </div>
                    </div>

                    <div className="rounded-xl bg-red-950/40 px-4 py-4">
                      <div className="text-sm text-zinc-300">2º lugar</div>
                      <div className="mt-2 text-xl font-bold text-white">
                        {money(selectedStage.payouts.second)}
                      </div>
                    </div>

                    <div className="rounded-xl bg-red-950/40 px-4 py-4">
                      <div className="text-sm text-zinc-300">3º lugar</div>
                      <div className="mt-2 text-xl font-bold text-white">
                        {money(selectedStage.payouts.third)}
                      </div>
                    </div>

                    <div className="rounded-xl bg-red-950/40 px-4 py-4">
                      <div className="text-sm text-zinc-300">4º lugar</div>
                      <div className="mt-2 text-xl font-bold text-white">
                        {money(selectedStage.payouts.fourth)}
                      </div>
                    </div>

                    <div className="rounded-xl bg-red-950/40 px-4 py-4">
                      <div className="text-sm text-zinc-300">Extra / acordo</div>
                      <div className="mt-2 text-xl font-bold text-white">
                        {money(selectedStage.payouts.extra)}
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
        )}

        {tab === "blinds" && (
          <div className="rounded-[28px] border border-red-800 bg-black/80 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Estruturas de blind</h2>

              <select
                value={selectedBlindProfileId}
                onChange={(e) => setSelectedBlindProfileId(e.target.value)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
              >
                <option value="">Selecione a estrutura</option>
                {blindProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.nome}
                  </option>
                ))}
              </select>
            </div>

            {!selectedBlindProfile && (
              <p className="mt-6 text-zinc-500">
                Selecione uma estrutura para visualizar.
              </p>
            )}

            {selectedBlindProfile && (
              <div className="mt-6 space-y-6">
                <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-5">
                  <div className="text-xl font-bold text-red-400">
                    {selectedBlindProfile.nome}
                  </div>
                  <div className="mt-1 text-sm text-zinc-500">
                    {selectedBlindProfile.minutos} minutos por nível
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-red-900">
                  <table className="min-w-full">
                    <thead className="bg-zinc-950/90">
                      <tr className="text-left text-sm text-zinc-400">
                        <th className="px-4 py-3">Nível</th>
                        <th className="px-4 py-3">Small blind</th>
                        <th className="px-4 py-3">Big blind</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBlindProfile.niveis.map((level, index) => (
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
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}