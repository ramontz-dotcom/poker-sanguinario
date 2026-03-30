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

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "Não agendada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return date.toLocaleString("pt-BR");
}

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
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

export default function DealerPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("jogadores");

  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [pix, setPix] = useState("");

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editApelido, setEditApelido] = useState("");
  const [editPix, setEditPix] = useState("");

  const [blindProfiles, setBlindProfiles] = useState<BlindProfile[]>([]);
  const [loadingBlinds, setLoadingBlinds] = useState(true);
  const [savingBlind, setSavingBlind] = useState(false);

  const [blindProfileName, setBlindProfileName] = useState("");
  const [blindMinutes, setBlindMinutes] = useState(15);
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>([
    { id: makeId(), small: 25, big: 50 },
    { id: makeId(), small: 50, big: 100 },
    { id: makeId(), small: 75, big: 150 },
  ]);

  const [stage, setStage] = useState<Stage | null>(null);
  const [loadingStage, setLoadingStage] = useState(true);
  const [savingStage, setSavingStage] = useState(false);
  const [editingStage, setEditingStage] = useState(false);

  const [stageForm, setStageForm] = useState({
    nome: "",
    data: "",
    status: "agendada",
    local_nome: "",
    endereco: "",
    notes: "",
  });

  useEffect(() => {
    const mode = localStorage.getItem("poker_access_mode");

    if (mode !== "dealer") {
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

    const latestStage = (data as Stage | null) || null;
    setStage(latestStage);

    if (latestStage) {
      setStageForm({
        nome: latestStage.nome || "",
        data: toDatetimeLocal(latestStage.data_etapa),
        status: latestStage.status || "agendada",
        local_nome: latestStage.local_nome || "",
        endereco: latestStage.endereco || "",
        notes: latestStage.notes || "",
      });
    } else {
      setStageForm({
        nome: "",
        data: "",
        status: "agendada",
        local_nome: "",
        endereco: "",
        notes: "",
      });
    }

    setLoadingStage(false);
  }

  function handleLogout() {
    localStorage.removeItem("poker_access_mode");
    router.push("/");
  }

  async function addPlayer() {
    if (!nome.trim() || !apelido.trim()) {
      alert("Nome e apelido são obrigatórios.");
      return;
    }

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

  function startEditPlayer(player: Player) {
    setEditingPlayerId(player.id);
    setEditNome(player.nome);
    setEditApelido(player.apelido);
    setEditPix(player.pix || "");
  }

  function cancelEditPlayer() {
    setEditingPlayerId(null);
    setEditNome("");
    setEditApelido("");
    setEditPix("");
  }

  async function saveEditPlayer(playerId: string) {
    if (!editNome.trim() || !editApelido.trim()) {
      alert("Nome e apelido são obrigatórios.");
      return;
    }

    const { error } = await supabase
      .from("players")
      .update({
        nome: editNome.trim(),
        apelido: editApelido.trim(),
        pix: editPix.trim() || null,
      })
      .eq("id", playerId);

    if (error) {
      console.error("Erro ao editar jogador:", error);
      alert("Erro ao editar jogador.");
      return;
    }

    cancelEditPlayer();
    await loadPlayers();
  }

  async function removePlayer(playerId: string) {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este jogador?"
    );
    if (!confirmed) return;

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

  async function saveBlindProfile() {
    if (!blindProfileName.trim() || blindLevels.length === 0) {
      alert("Informe o nome da estrutura e ao menos um nível.");
      return;
    }

    setSavingBlind(true);

    const { data: profile, error: profileError } = await supabase
      .from("blind_profiles")
      .insert([
        {
          nome: blindProfileName.trim(),
          minutos: Number(blindMinutes || 0),
        },
      ])
      .select()
      .single();

    if (profileError) {
      console.error("Erro ao salvar perfil de blind:", profileError);
      alert("Erro ao salvar perfil de blind.");
      setSavingBlind(false);
      return;
    }

    const levelsPayload = blindLevels.map((level, index) => ({
      blind_profile_id: profile.id,
      nivel: index + 1,
      small: Number(level.small || 0),
      big: Number(level.big || 0),
    }));

    const { error: levelsError } = await supabase
      .from("blind_levels")
      .insert(levelsPayload);

    if (levelsError) {
      console.error("Erro ao salvar níveis de blind:", levelsError);
      alert("Erro ao salvar níveis do blind.");
      setSavingBlind(false);
      return;
    }

    setBlindProfileName("");
    setBlindMinutes(15);
    setBlindLevels([
      { id: makeId(), small: 25, big: 50 },
      { id: makeId(), small: 50, big: 100 },
      { id: makeId(), small: 75, big: 150 },
    ]);

    await loadBlindProfiles();
    setSavingBlind(false);
  }

  async function removeBlindProfile(profileId: string) {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta estrutura de blinds?"
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("blind_profiles")
      .delete()
      .eq("id", profileId);

    if (error) {
      console.error("Erro ao remover blind:", error);
      alert("Erro ao remover blind.");
      return;
    }

    await loadBlindProfiles();
  }

  async function createStage() {
    if (!stageForm.nome.trim() || !stageForm.data) {
      alert("Preencha nome e data da etapa.");
      return;
    }

    setSavingStage(true);

    const payload = {
      nome: stageForm.nome.trim(),
      data_etapa: stageForm.data,
      status: stageForm.status || "agendada",
      local_nome: stageForm.local_nome.trim() || null,
      endereco: stageForm.endereco.trim() || null,
      notes: stageForm.notes.trim() || null,
    };

    const { error } = await supabase.from("stages").insert([payload]);

    if (error) {
      console.error("Erro ao criar etapa:", error);
      alert("Erro ao criar etapa.");
      setSavingStage(false);
      return;
    }

    setEditingStage(false);
    await loadLatestStage();
    setSavingStage(false);
  }

  async function updateStage() {
    if (!stage) return;

    if (!stageForm.nome.trim() || !stageForm.data) {
      alert("Preencha nome e data da etapa.");
      return;
    }

    setSavingStage(true);

    const { error } = await supabase
      .from("stages")
      .update({
        nome: stageForm.nome.trim(),
        data_etapa: stageForm.data,
        status: stageForm.status || "agendada",
        local_nome: stageForm.local_nome.trim() || null,
        endereco: stageForm.endereco.trim() || null,
        notes: stageForm.notes.trim() || null,
      })
      .eq("id", stage.id);

    if (error) {
      console.error("Erro ao atualizar etapa:", error);
      alert("Erro ao atualizar etapa.");
      setSavingStage(false);
      return;
    }

    setEditingStage(false);
    await loadLatestStage();
    setSavingStage(false);
  }

  function copyWhatsAppMessage() {
    if (!stage) return;

    const dateText = stage.data_etapa
      ? new Date(stage.data_etapa).toLocaleString("pt-BR")
      : "Data a definir";

    const message = `🩸 Poker Sanguinário

📅 ${stage.nome} - ${dateText}
📍 ${stage.local_nome || "Local a definir"}
📌 ${stage.endereco || "Endereço a definir"}

${stage.notes ? `📝 ${stage.notes}\n\n` : ""}Confirma presença aí!`;

    navigator.clipboard
      .writeText(message)
      .then(() => alert("Mensagem copiada para enviar no WhatsApp."))
      .catch((err) => {
        console.error(err);
        alert("Não foi possível copiar a mensagem.");
      });
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
    { key: "jogadores", label: "Jogadores" },
    { key: "ranking", label: "Ranking" },
    { key: "blinds", label: "Blinds" },
  ];

  return (
    <AppShell role="dealer" onLogout={handleLogout}>
      <div className="space-y-6">
        <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Próxima etapa</h2>
              <p className="mt-2 text-sm text-zinc-400 sm:text-base">
                Agende a rodada, copie o aviso para o grupo e abra o endereço no Google Maps.
              </p>
            </div>

            {stage && !editingStage && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => setEditingStage(true)}
                  className="rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-900"
                >
                  Editar etapa
                </button>

                <button
                  onClick={copyWhatsAppMessage}
                  className="rounded-2xl bg-red-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-600"
                >
                  Copiar aviso WhatsApp
                </button>

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
            ) : stage && !editingStage ? (
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
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={stageForm.nome}
                  onChange={(e) =>
                    setStageForm((current) => ({ ...current, nome: e.target.value }))
                  }
                  placeholder="Nome da etapa"
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-700"
                />

                <input
                  type="datetime-local"
                  value={stageForm.data}
                  onChange={(e) =>
                    setStageForm((current) => ({ ...current, data: e.target.value }))
                  }
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-700"
                />

                <select
                  value={stageForm.status}
                  onChange={(e) =>
                    setStageForm((current) => ({ ...current, status: e.target.value }))
                  }
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-700"
                >
                  <option value="falta_agendar">Falta agendar</option>
                  <option value="agendada">Agendada</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="encerrada">Encerrada</option>
                </select>

                <input
                  value={stageForm.local_nome}
                  onChange={(e) =>
                    setStageForm((current) => ({
                      ...current,
                      local_nome: e.target.value,
                    }))
                  }
                  placeholder="Local"
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-700"
                />

                <div className="md:col-span-2">
                  <input
                    value={stageForm.endereco}
                    onChange={(e) =>
                      setStageForm((current) => ({
                        ...current,
                        endereco: e.target.value,
                      }))
                    }
                    placeholder="Endereço"
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-700"
                  />
                </div>

                <div className="md:col-span-2">
                  <textarea
                    value={stageForm.notes}
                    onChange={(e) =>
                      setStageForm((current) => ({ ...current, notes: e.target.value }))
                    }
                    placeholder="Observações para o aviso"
                    className="min-h-[100px] w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-700"
                  />
                </div>

                <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={stage ? updateStage : createStage}
                    disabled={savingStage}
                    className="rounded-2xl bg-red-700 px-5 py-3 font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
                  >
                    {savingStage
                      ? "Salvando..."
                      : stage
                      ? "Salvar alterações"
                      : "Agendar etapa"}
                  </button>

                  {stage && (
                    <button
                      onClick={() => {
                        setEditingStage(false);
                        void loadLatestStage();
                      }}
                      className="rounded-2xl border border-zinc-700 px-5 py-3 font-semibold text-zinc-200 transition hover:bg-zinc-900"
                    >
                      Cancelar edição
                    </button>
                  )}
                </div>
              </div>
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
                      {editingPlayerId === player.id ? (
                        <div className="space-y-3">
                          <input
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            placeholder="Nome"
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                          />
                          <input
                            value={editApelido}
                            onChange={(e) => setEditApelido(e.target.value)}
                            placeholder="Apelido"
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                          />
                          <input
                            value={editPix}
                            onChange={(e) => setEditPix(e.target.value)}
                            placeholder="PIX"
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                          />

                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              onClick={() => saveEditPlayer(player.id)}
                              className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-600"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={cancelEditPlayer}
                              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-900"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
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

                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              onClick={() => startEditPlayer(player)}
                              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-900"
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => removePlayer(player.id)}
                              className="rounded-xl border border-red-800 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-950/30"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      )}
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
                Estruturas de blinds salvas online no Supabase.
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
                  disabled={savingBlind}
                  className="rounded-2xl bg-red-700 px-5 py-3 font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
                >
                  {savingBlind ? "Salvando..." : "Salvar estrutura"}
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
                {loadingBlinds && (
                  <p className="text-zinc-400">Carregando blinds...</p>
                )}

                {!loadingBlinds && blindProfiles.length === 0 && (
                  <p className="text-zinc-400">Nenhuma estrutura cadastrada ainda.</p>
                )}

                {!loadingBlinds &&
                  blindProfiles.map((profile) => (
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