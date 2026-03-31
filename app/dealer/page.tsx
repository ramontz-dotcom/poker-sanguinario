"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import { supabase } from "../../lib/supabase";

type Tab = "etapas" | "jogadores" | "blinds" | "ranking";

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

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
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

export default function DealerPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("etapas");

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
    { id: makeId(), small: 100, big: 200 },
  ]);

  const [stages, setStages] = useState<Stage[]>([]);
  const [allEntries, setAllEntries] = useState<StageEntry[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [selectedStageEntries, setSelectedStageEntries] = useState<StageEntry[]>(
    []
  );

  const [loadingStages, setLoadingStages] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [savingStage, setSavingStage] = useState(false);
  const [editingStage, setEditingStage] = useState(false);

  const [rankingStageId, setRankingStageId] = useState<string>("");

  const [stageForm, setStageForm] = useState({
    nome: "",
    data: "",
    status: "agendada",
    blind_profile_id: "",
    local_nome: "",
    endereco: "",
    notes: "",
    buy_in_default: "50",
    rebuy_default: "50",
    addon_default: "50",
    drink_total: "0",
    food_total: "0",
    admin_fee_total: "0",
    prize_1: "0",
    prize_2: "0",
    prize_3: "0",
    prize_4: "0",
    prize_notes: "",
  });

  useEffect(() => {
    const mode = localStorage.getItem("poker_access_mode");
    if (mode !== "dealer") {
      router.push("/");
      return;
    }
    void initialize();
  }, [router]);

  useEffect(() => {
    const stage = stages.find((item) => item.id === selectedStageId) || null;
    setSelectedStage(stage);

    if (stage) {
      setStageForm({
        nome: stage.nome || "",
        data: toDatetimeLocal(stage.data_etapa),
        status: stage.status || "agendada",
        blind_profile_id: stage.blind_profile_id || "",
        local_nome: stage.local_nome || "",
        endereco: stage.endereco || "",
        notes: stage.notes || "",
        buy_in_default: String(Number(stage.buy_in_default || 0)),
        rebuy_default: String(Number(stage.rebuy_default || 0)),
        addon_default: String(Number(stage.addon_default || 0)),
        drink_total: String(Number(stage.drink_total || 0)),
        food_total: String(Number(stage.food_total || 0)),
        admin_fee_total: String(Number(stage.admin_fee_total || 0)),
        prize_1: String(Number(stage.prize_1 || 0)),
        prize_2: String(Number(stage.prize_2 || 0)),
        prize_3: String(Number(stage.prize_3 || 0)),
        prize_4: String(Number(stage.prize_4 || 0)),
        prize_notes: stage.prize_notes || "",
      });
    }

    setSelectedStageEntries(
      allEntries.filter((entry) => entry.stage_id === selectedStageId)
    );
  }, [selectedStageId, stages, allEntries]);

  async function initialize() {
    await Promise.all([loadPlayers(), loadBlindProfiles(), loadStages(), loadAllEntries()]);
  }

  async function reloadEverything() {
    await Promise.all([loadPlayers(), loadBlindProfiles(), loadStages(), loadAllEntries()]);
  }

  async function loadPlayers() {
    setLoadingPlayers(true);

    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("apelido", { ascending: true });

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
      .select("*")
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
    setLoadingBlinds(false);
  }

  async function loadStages() {
    setLoadingStages(true);

    const { data, error } = await supabase
      .from("stages")
      .select("*")
      .order("data_etapa", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar etapas:", error);
      alert("Erro ao carregar etapas.");
      setLoadingStages(false);
      return;
    }

    const rows = (data as Stage[]) || [];
    setStages(rows);

    const activeStage = rows.find((stage) => stage.status === "em_andamento");
    const newestStage = rows[0];

    const nextSelected =
      rows.find((item) => item.id === selectedStageId)?.id ||
      activeStage?.id ||
      newestStage?.id ||
      "";

    setSelectedStageId(nextSelected);
    setRankingStageId((current) => current || nextSelected);

    setLoadingStages(false);
  }

  async function loadAllEntries() {
    setLoadingEntries(true);

    const { data, error } = await supabase
      .from("stage_entries")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao carregar lançamentos da etapa:", error);
      alert("Erro ao carregar lançamentos.");
      setLoadingEntries(false);
      return;
    }

    setAllEntries((data as StageEntry[]) || []);
    setLoadingEntries(false);
  }

  function handleLogout() {
    localStorage.removeItem("poker_access_mode");
    router.push("/");
  }

  function resetStageForm() {
    setStageForm({
      nome: "",
      data: "",
      status: "agendada",
      blind_profile_id: "",
      local_nome: "",
      endereco: "",
      notes: "",
      buy_in_default: "50",
      rebuy_default: "50",
      addon_default: "50",
      drink_total: "0",
      food_total: "0",
      admin_fee_total: "0",
      prize_1: "0",
      prize_2: "0",
      prize_3: "0",
      prize_4: "0",
      prize_notes: "",
    });
  }

  function startNewStage() {
    setSelectedStageId("");
    setSelectedStage(null);
    setSelectedStageEntries([]);
    resetStageForm();
    setEditingStage(true);
    setTab("etapas");
  }

  function selectedBlindProfile() {
    return blindProfiles.find(
      (profile) => profile.id === selectedStage?.blind_profile_id
    );
  }

  function getPlayerById(playerId: string) {
    return players.find((player) => player.id === playerId);
  }

  function getEntryByPlayer(stageId: string, playerId: string) {
    return allEntries.find(
      (entry) => entry.stage_id === stageId && entry.player_id === playerId
    );
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
      { id: makeId(), small: 100, big: 200 },
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

  function buildStagePayload() {
    return {
      nome: stageForm.nome.trim(),
      data_etapa: stageForm.data || null,
      status: stageForm.status || "agendada",
      blind_profile_id: stageForm.blind_profile_id || null,
      local_nome: stageForm.local_nome.trim() || null,
      endereco: stageForm.endereco.trim() || null,
      notes: stageForm.notes.trim() || null,
      buy_in_default: Number(stageForm.buy_in_default || 0),
      rebuy_default: Number(stageForm.rebuy_default || 0),
      addon_default: Number(stageForm.addon_default || 0),
      drink_total: Number(stageForm.drink_total || 0),
      food_total: Number(stageForm.food_total || 0),
      admin_fee_total: Number(stageForm.admin_fee_total || 0),
      prize_1: Number(stageForm.prize_1 || 0),
      prize_2: Number(stageForm.prize_2 || 0),
      prize_3: Number(stageForm.prize_3 || 0),
      prize_4: Number(stageForm.prize_4 || 0),
      prize_notes: stageForm.prize_notes.trim() || null,
    };
  }

  async function createStage() {
    if (!stageForm.nome.trim()) {
      alert("Informe o nome da etapa.");
      return;
    }

    setSavingStage(true);

    const { data, error } = await supabase
      .from("stages")
      .insert([buildStagePayload()])
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar etapa:", error);
      alert("Erro ao criar etapa.");
      setSavingStage(false);
      return;
    }

    await Promise.all([loadStages(), loadAllEntries()]);
    setSelectedStageId(data.id);
    setEditingStage(false);
    setSavingStage(false);
  }

  async function updateStage() {
    if (!selectedStage) return;

    if (!stageForm.nome.trim()) {
      alert("Informe o nome da etapa.");
      return;
    }

    setSavingStage(true);

    const { error } = await supabase
      .from("stages")
      .update(buildStagePayload())
      .eq("id", selectedStage.id);

    if (error) {
      console.error("Erro ao atualizar etapa:", error);
      alert("Erro ao atualizar etapa.");
      setSavingStage(false);
      return;
    }

    await loadStages();
    setEditingStage(false);
    setSavingStage(false);
  }

  async function setStageStatus(stageId: string, newStatus: string) {
    if (newStatus === "em_andamento") {
      const activeStage = stages.find(
        (stage) => stage.status === "em_andamento" && stage.id !== stageId
      );

      if (activeStage) {
        const { error: deactivateError } = await supabase
          .from("stages")
          .update({ status: "agendada" })
          .eq("id", activeStage.id);

        if (deactivateError) {
          console.error(deactivateError);
          alert("Erro ao trocar a etapa em andamento.");
          return;
        }
      }
    }

    const { error } = await supabase
      .from("stages")
      .update({ status: newStatus })
      .eq("id", stageId);

    if (error) {
      console.error("Erro ao atualizar status da etapa:", error);
      alert("Erro ao atualizar status da etapa.");
      return;
    }

    await loadStages();
  }

  async function copyWhatsAppMessage() {
    if (!selectedStage) return;

    const blindName =
      blindProfiles.find((profile) => profile.id === selectedStage.blind_profile_id)
        ?.nome || "Estrutura não informada";

    const dateText = selectedStage.data_etapa
      ? new Date(selectedStage.data_etapa).toLocaleString("pt-BR")
      : "Data a definir";

    const message = `🩸 Poker Sanguinário

📅 ${selectedStage.nome} - ${dateText}
📍 ${selectedStage.local_nome || "Local a definir"}
📌 ${selectedStage.endereco || "Endereço a definir"}
♠ Blind: ${blindName}

${
  selectedStage.notes
    ? `📝 ${selectedStage.notes}\n\n`
    : ""
}Confirma presença aí!`;

    try {
      await navigator.clipboard.writeText(message);
      alert("Mensagem copiada para enviar no WhatsApp.");
    } catch (err) {
      console.error(err);
      alert("Não foi possível copiar a mensagem.");
    }
  }

  function openMaps() {
    if (!selectedStage?.endereco) {
      alert("Essa etapa ainda não tem endereço cadastrado.");
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      selectedStage.endereco
    )}`;
    window.open(url, "_blank");
  }

  async function togglePlayerInStage(player: Player) {
    if (!selectedStage) {
      alert("Selecione ou crie uma etapa.");
      return;
    }

    const existingEntry = getEntryByPlayer(selectedStage.id, player.id);

    if (existingEntry) {
      const confirmed = window.confirm(
        "Deseja remover este jogador da etapa?"
      );
      if (!confirmed) return;

      const { error } = await supabase
        .from("stage_entries")
        .delete()
        .eq("id", existingEntry.id);

      if (error) {
        console.error("Erro ao remover jogador da etapa:", error);
        alert("Erro ao remover jogador da etapa.");
        return;
      }
    } else {
      const { error } = await supabase.from("stage_entries").insert([
        {
          stage_id: selectedStage.id,
          player_id: player.id,
          inscrito: true,
          eliminado: false,
          buy_in: Number(selectedStage.buy_in_default || 0),
          rebuys: 0,
          rebuy_value: Number(selectedStage.rebuy_default || 0),
          addon: false,
          addon_value: Number(selectedStage.addon_default || 0),
          drink: false,
          food: false,
          admin_fee: false,
          position: null,
        },
      ]);

      if (error) {
        console.error("Erro ao incluir jogador na etapa:", error);
        alert("Erro ao incluir jogador na etapa.");
        return;
      }
    }

    await loadAllEntries();
  }

  async function updateEntry(entryId: string, values: Partial<StageEntry>) {
    const { error } = await supabase
      .from("stage_entries")
      .update(values)
      .eq("id", entryId);

    if (error) {
      console.error("Erro ao atualizar lançamento:", error);
      alert("Erro ao atualizar lançamento.");
      return;
    }

    await loadAllEntries();
  }

  async function addRebuy(entry: StageEntry) {
    await updateEntry(entry.id, {
      rebuys: Number(entry.rebuys || 0) + 1,
    });
  }

  async function removeRebuy(entry: StageEntry) {
    await updateEntry(entry.id, {
      rebuys: Math.max(0, Number(entry.rebuys || 0) - 1),
    });
  }

  async function setBuyInValue(entry: StageEntry, value: number) {
    await updateEntry(entry.id, {
      buy_in: value,
    });
  }

  async function setRebuyValue(entry: StageEntry, value: number) {
    await updateEntry(entry.id, {
      rebuy_value: value,
    });
  }

  async function setAddonValue(entry: StageEntry, value: number) {
    await updateEntry(entry.id, {
      addon_value: value,
    });
  }

  async function toggleAddon(entry: StageEntry) {
    await updateEntry(entry.id, {
      addon: !entry.addon,
    });
  }

  async function toggleDrink(entry: StageEntry) {
    await updateEntry(entry.id, { drink: !entry.drink });
  }

  async function toggleFood(entry: StageEntry) {
    await updateEntry(entry.id, { food: !entry.food });
  }

  async function toggleAdminFee(entry: StageEntry) {
    await updateEntry(entry.id, { admin_fee: !entry.admin_fee });
  }

  async function toggleEliminado(entry: StageEntry) {
    await updateEntry(entry.id, {
      eliminado: !entry.eliminado,
      position: !entry.eliminado ? entry.position : null,
    });
  }

  async function setPosition(entry: StageEntry, value: number | null) {
    await updateEntry(entry.id, {
      position: value,
      eliminado: value ? true : entry.eliminado,
    });
  }

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => a.apelido.localeCompare(b.apelido));
  }, [players]);

  const currentBlindProfile = useMemo(() => {
    if (!selectedStage) return null;
    return blindProfiles.find(
      (profile) => profile.id === selectedStage.blind_profile_id
    );
  }, [blindProfiles, selectedStage]);

  const currentStageEntries = useMemo(() => {
    if (!selectedStage) return [];
    return [...selectedStageEntries].sort((a, b) => {
      const aPlayer = getPlayerById(a.player_id)?.apelido || "";
      const bPlayer = getPlayerById(b.player_id)?.apelido || "";
      return aPlayer.localeCompare(bPlayer);
    });
  }, [selectedStageEntries, selectedStage, players]);

  const pokerCash = useMemo(() => {
    return currentStageEntries.reduce((total, entry) => {
      const buyIn = Number(entry.buy_in || 0);
      const rebuyTotal = Number(entry.rebuys || 0) * Number(entry.rebuy_value || 0);
      const addonTotal = entry.addon ? Number(entry.addon_value || 0) : 0;
      return total + buyIn + rebuyTotal + addonTotal;
    }, 0);
  }, [currentStageEntries]);

  const drinkCount = useMemo(
    () => currentStageEntries.filter((entry) => entry.drink).length,
    [currentStageEntries]
  );

  const foodCount = useMemo(
    () => currentStageEntries.filter((entry) => entry.food).length,
    [currentStageEntries]
  );

  const adminFeeCount = useMemo(
    () => currentStageEntries.filter((entry) => entry.admin_fee).length,
    [currentStageEntries]
  );

  const drinkPerHead = drinkCount
    ? Number(selectedStage?.drink_total || 0) / drinkCount
    : 0;

  const foodPerHead = foodCount
    ? Number(selectedStage?.food_total || 0) / foodCount
    : 0;

  const adminFeePerHead = adminFeeCount
    ? Number(selectedStage?.admin_fee_total || 0) / adminFeeCount
    : 0;

  const grandTotal =
    pokerCash +
    Number(selectedStage?.drink_total || 0) +
    Number(selectedStage?.food_total || 0) +
    Number(selectedStage?.admin_fee_total || 0);

  const rankingStage = useMemo(() => {
    return stages.find((stage) => stage.id === rankingStageId) || null;
  }, [stages, rankingStageId]);

  const rankingStageEntries = useMemo(() => {
    if (!rankingStage) return [];
    return allEntries
      .filter((entry) => entry.stage_id === rankingStage.id)
      .filter((entry) => entry.position)
      .sort((a, b) => Number(a.position || 999) - Number(b.position || 999));
  }, [rankingStage, allEntries]);

  const overallRanking = useMemo(() => {
    const closedStagesIds = new Set(
      stages.filter((stage) => stage.status === "encerrada").map((stage) => stage.id)
    );

    const map = new Map<string, RankingRow>();

    for (const entry of allEntries) {
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
  }, [allEntries, stages, players]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "etapas", label: "Etapas" },
    { key: "jogadores", label: "Jogadores" },
    { key: "blinds", label: "Blinds" },
    { key: "ranking", label: "Ranking" },
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

        {tab === "etapas" && (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">Controle de etapas</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Crie várias etapas, selecione uma, faça os lançamentos e encerre a rodada.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div>
                    <label className="mb-2 block text-sm text-zinc-300">
                      Etapa selecionada
                    </label>
                    <select
                      value={selectedStageId}
                      onChange={(e) => {
                        setSelectedStageId(e.target.value);
                        setEditingStage(false);
                      }}
                      className="min-w-[260px] rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                    >
                      <option value="">Selecione uma etapa</option>
                      {stages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.nome} • {stageStatusLabel(stage.status)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={startNewStage}
                    className="rounded-2xl bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-600"
                  >
                    Nova etapa
                  </button>
                </div>
              </div>
            </div>

            {(editingStage || !selectedStage) && (
              <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
                <h3 className="text-2xl font-bold text-white">
                  {selectedStage ? "Editar etapa" : "Criar etapa"}
                </h3>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  <input
                    value={stageForm.nome}
                    onChange={(e) =>
                      setStageForm((current) => ({ ...current, nome: e.target.value }))
                    }
                    placeholder="Nome da etapa"
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />

                  <input
                    type="datetime-local"
                    value={stageForm.data}
                    onChange={(e) =>
                      setStageForm((current) => ({ ...current, data: e.target.value }))
                    }
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />

                  <select
                    value={stageForm.status}
                    onChange={(e) =>
                      setStageForm((current) => ({ ...current, status: e.target.value }))
                    }
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="falta_agendar">Falta agendar</option>
                    <option value="agendada">Agendada</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="encerrada">Encerrada</option>
                  </select>

                  <select
                    value={stageForm.blind_profile_id}
                    onChange={(e) =>
                      setStageForm((current) => ({
                        ...current,
                        blind_profile_id: e.target.value,
                      }))
                    }
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  >
                    <option value="">Selecione a estrutura de blinds</option>
                    {blindProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.nome} ({profile.minutos} min)
                      </option>
                    ))}
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
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />

                  <input
                    value={stageForm.endereco}
                    onChange={(e) =>
                      setStageForm((current) => ({
                        ...current,
                        endereco: e.target.value,
                      }))
                    }
                    placeholder="Endereço"
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />

                  <input
                    type="number"
                    value={stageForm.buy_in_default}
                    onChange={(e) =>
                      setStageForm((current) => ({
                        ...current,
                        buy_in_default: e.target.value,
                      }))
                    }
                    placeholder="Buy-in padrão"
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />

                  <input
                    type="number"
                    value={stageForm.rebuy_default}
                    onChange={(e) =>
                      setStageForm((current) => ({
                        ...current,
                        rebuy_default: e.target.value,
                      }))
                    }
                    placeholder="Rebuy padrão"
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />

                  <input
                    type="number"
                    value={stageForm.addon_default}
                    onChange={(e) =>
                      setStageForm((current) => ({
                        ...current,
                        addon_default: e.target.value,
                      }))
                    }
                    placeholder="Add-on padrão"
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />

                  <input
                    type="number"
                    value={stageForm.drink_total}
                    onChange={(e) =>
                      setStageForm((current) => ({
                        ...current,
                        drink_total: e.target.value,
                      }))
                    }
                    placeholder="Total bebida"
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />

                  <input
                    type="number"
                    value={stageForm.food_total}
                    onChange={(e) =>
                      setStageForm((current) => ({
                        ...current,
                        food_total: e.target.value,
                      }))
                    }
                    placeholder="Total comida"
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />

                  <input
                    type="number"
                    value={stageForm.admin_fee_total}
                    onChange={(e) =>
                      setStageForm((current) => ({
                        ...current,
                        admin_fee_total: e.target.value,
                      }))
                    }
                    placeholder="Taxa/administração"
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />

                  <input
                    type="number"
                    value={stageForm.prize_1}
                    onChange={(e) =>
                      setStageForm((current) => ({
                        ...current,
                        prize_1: e.target.value,
                      }))
                    }
                    placeholder="Prêmio 1º"
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />

                  <input
                    type="number"
                    value={stageForm.prize_2}
                    onChange={(e) =>
                      setStageForm((current) => ({
                        ...current,
                        prize_2: e.target.value,
                      }))
                    }
                    placeholder="Prêmio 2º"
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />

                  <input
                    type="number"
                    value={stageForm.prize_3}
                    onChange={(e) =>
                      setStageForm((current) => ({
                        ...current,
                        prize_3: e.target.value,
                      }))
                    }
                    placeholder="Prêmio 3º"
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />

                  <input
                    type="number"
                    value={stageForm.prize_4}
                    onChange={(e) =>
                      setStageForm((current) => ({
                        ...current,
                        prize_4: e.target.value,
                      }))
                    }
                    placeholder="Prêmio 4º"
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                  />

                  <div className="md:col-span-2">
                    <textarea
                      value={stageForm.notes}
                      onChange={(e) =>
                        setStageForm((current) => ({ ...current, notes: e.target.value }))
                      }
                      placeholder="Observações gerais"
                      className="min-h-[90px] w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <textarea
                      value={stageForm.prize_notes}
                      onChange={(e) =>
                        setStageForm((current) => ({
                          ...current,
                          prize_notes: e.target.value,
                        }))
                      }
                      placeholder="Observações da premiação / divisão livre"
                      className="min-h-[90px] w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                    />
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={selectedStage ? updateStage : createStage}
                      disabled={savingStage}
                      className="rounded-2xl bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-600 disabled:opacity-60"
                    >
                      {savingStage
                        ? "Salvando..."
                        : selectedStage
                        ? "Salvar alterações"
                        : "Criar etapa"}
                    </button>

                    <button
                      onClick={() => {
                        setEditingStage(false);
                        if (selectedStageId) {
                          const current = stages.find((stage) => stage.id === selectedStageId);
                          if (current) {
                            setStageForm({
                              nome: current.nome || "",
                              data: toDatetimeLocal(current.data_etapa),
                              status: current.status || "agendada",
                              blind_profile_id: current.blind_profile_id || "",
                              local_nome: current.local_nome || "",
                              endereco: current.endereco || "",
                              notes: current.notes || "",
                              buy_in_default: String(Number(current.buy_in_default || 0)),
                              rebuy_default: String(Number(current.rebuy_default || 0)),
                              addon_default: String(Number(current.addon_default || 0)),
                              drink_total: String(Number(current.drink_total || 0)),
                              food_total: String(Number(current.food_total || 0)),
                              admin_fee_total: String(
                                Number(current.admin_fee_total || 0)
                              ),
                              prize_1: String(Number(current.prize_1 || 0)),
                              prize_2: String(Number(current.prize_2 || 0)),
                              prize_3: String(Number(current.prize_3 || 0)),
                              prize_4: String(Number(current.prize_4 || 0)),
                              prize_notes: current.prize_notes || "",
                            });
                          }
                        } else {
                          resetStageForm();
                        }
                      }}
                      className="rounded-2xl border border-zinc-700 px-5 py-3 font-semibold text-zinc-200 hover:bg-zinc-900"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedStage && !editingStage && (
              <>
                <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white">{selectedStage.nome}</h3>
                      <p className="mt-2 text-sm text-zinc-400">
                        {formatDateTime(selectedStage.data_etapa)} •{" "}
                        {stageStatusLabel(selectedStage.status)}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Blind: {currentBlindProfile?.nome || "Não informado"}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        onClick={() => setEditingStage(true)}
                        className="rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-900"
                      >
                        Editar etapa
                      </button>

                      <button
                        onClick={copyWhatsAppMessage}
                        className="rounded-2xl bg-red-700 px-4 py-3 text-sm font-bold text-white hover:bg-red-600"
                      >
                        Copiar aviso WhatsApp
                      </button>

                      <button
                        onClick={openMaps}
                        className="rounded-2xl border border-red-800 px-4 py-3 text-sm font-semibold text-white hover:bg-red-950/30"
                      >
                        Abrir no Google Maps
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Buy-in
                      </div>
                      <div className="mt-2 text-lg font-bold text-white">
                        {formatMoney(selectedStage.buy_in_default)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Rebuy
                      </div>
                      <div className="mt-2 text-lg font-bold text-white">
                        {formatMoney(selectedStage.rebuy_default)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Add-on
                      </div>
                      <div className="mt-2 text-lg font-bold text-white">
                        {formatMoney(selectedStage.addon_default)}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">
                        Local
                      </div>
                      <div className="mt-2 text-lg font-bold text-white">
                        {selectedStage.local_nome || "Não informado"}
                      </div>
                      <div className="mt-1 text-sm text-zinc-500">
                        {selectedStage.endereco || "Endereço não informado"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      onClick={() => setStageStatus(selectedStage.id, "agendada")}
                      className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-900"
                    >
                      Marcar como agendada
                    </button>

                    <button
                      onClick={() => setStageStatus(selectedStage.id, "em_andamento")}
                      className="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-600"
                    >
                      Colocar em andamento
                    </button>

                    <button
                      onClick={() => setStageStatus(selectedStage.id, "encerrada")}
                      className="rounded-xl border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950/30"
                    >
                      Encerrar etapa
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">
                      Caixa do poker
                    </div>
                    <div className="mt-3 text-2xl font-black text-white">
                      {formatMoney(pokerCash)}
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      Buy-in + Rebuy + Add-on
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">
                      Bebida
                    </div>
                    <div className="mt-3 text-2xl font-black text-white">
                      {formatMoney(selectedStage.drink_total)}
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      {drinkCount} participante(s) • {formatMoney(drinkPerHead)}/pessoa
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">
                      Comida
                    </div>
                    <div className="mt-3 text-2xl font-black text-white">
                      {formatMoney(selectedStage.food_total)}
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      {foodCount} participante(s) • {formatMoney(foodPerHead)}/pessoa
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">
                      Taxa/Admin
                    </div>
                    <div className="mt-3 text-2xl font-black text-white">
                      {formatMoney(selectedStage.admin_fee_total)}
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      {adminFeeCount} participante(s) • {formatMoney(adminFeePerHead)}/pessoa
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl">
                    <div className="text-xs uppercase tracking-wide text-zinc-500">
                      Total geral
                    </div>
                    <div className="mt-3 text-2xl font-black text-white">
                      {formatMoney(grandTotal)}
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      Poker + rateios
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.95fr]">
                  <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-bold text-white">
                          Lançamentos da etapa
                        </h3>
                        <p className="mt-1 text-sm text-zinc-400">
                          Controle buy-in, recompras, adicional, rateios e posição final.
                        </p>
                      </div>
                      <span className="rounded-full border border-red-900 px-3 py-1 text-xs text-zinc-300">
                        {currentStageEntries.length} inscrito(s)
                      </span>
                    </div>

                    <div className="mt-6 space-y-4">
                      {currentStageEntries.length === 0 && (
                        <p className="text-zinc-400">Nenhum jogador inscrito nesta etapa.</p>
                      )}

                      {currentStageEntries.map((entry) => {
                        const player = getPlayerById(entry.player_id);
                        if (!player) return null;

                        const entryTotal =
                          Number(entry.buy_in || 0) +
                          Number(entry.rebuys || 0) * Number(entry.rebuy_value || 0) +
                          (entry.addon ? Number(entry.addon_value || 0) : 0) +
                          (entry.drink ? drinkPerHead : 0) +
                          (entry.food ? foodPerHead : 0) +
                          (entry.admin_fee ? adminFeePerHead : 0);

                        return (
                          <div
                            key={entry.id}
                            className="rounded-2xl border border-red-900 bg-zinc-950/60 p-4"
                          >
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <div className="text-lg font-bold text-white">
                                    {player.apelido}
                                  </div>
                                  <div className="text-sm text-zinc-400">{player.nome}</div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => toggleEliminado(entry)}
                                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                                      entry.eliminado
                                        ? "bg-red-700 text-white"
                                        : "border border-zinc-700 text-zinc-300"
                                    }`}
                                  >
                                    {entry.eliminado ? "Eliminado" : "Jogando"}
                                  </button>

                                  <button
                                    onClick={() =>
                                      togglePlayerInStage(player)
                                    }
                                    className="rounded-xl border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950/30"
                                  >
                                    Remover da etapa
                                  </button>
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                                <div>
                                  <label className="mb-1 block text-xs text-zinc-500">
                                    Buy-in
                                  </label>
                                  <input
                                    type="number"
                                    value={Number(entry.buy_in || 0)}
                                    onChange={(e) =>
                                      setBuyInValue(entry, Number(e.target.value || 0))
                                    }
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white"
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs text-zinc-500">
                                    Rebuys
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => removeRebuy(entry)}
                                      className="rounded-lg border border-zinc-700 px-2 py-2 text-white"
                                    >
                                      -
                                    </button>
                                    <span className="min-w-[28px] text-center text-lg font-bold text-white">
                                      {Number(entry.rebuys || 0)}
                                    </span>
                                    <button
                                      onClick={() => addRebuy(entry)}
                                      className="rounded-lg bg-red-700 px-2 py-2 font-bold text-white"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs text-zinc-500">
                                    Valor do rebuy
                                  </label>
                                  <input
                                    type="number"
                                    value={Number(entry.rebuy_value || 0)}
                                    onChange={(e) =>
                                      setRebuyValue(entry, Number(e.target.value || 0))
                                    }
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white"
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs text-zinc-500">
                                    Add-on
                                  </label>
                                  <button
                                    onClick={() => toggleAddon(entry)}
                                    className={`w-full rounded-xl px-3 py-2 text-sm font-semibold ${
                                      entry.addon
                                        ? "bg-blue-700 text-white"
                                        : "border border-zinc-700 text-zinc-300"
                                    }`}
                                  >
                                    {entry.addon ? "Ativo" : "Marcar"}
                                  </button>
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs text-zinc-500">
                                    Valor do add-on
                                  </label>
                                  <input
                                    type="number"
                                    value={Number(entry.addon_value || 0)}
                                    onChange={(e) =>
                                      setAddonValue(entry, Number(e.target.value || 0))
                                    }
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white"
                                  />
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs text-zinc-500">
                                    Posição
                                  </label>
                                  <select
                                    value={entry.position || ""}
                                    onChange={(e) =>
                                      setPosition(
                                        entry,
                                        e.target.value ? Number(e.target.value) : null
                                      )
                                    }
                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white"
                                  >
                                    <option value="">Sem posição</option>
                                    {Array.from({ length: Math.max(players.length, 20) }).map(
                                      (_, index) => (
                                        <option key={index + 1} value={index + 1}>
                                          {index + 1}º
                                        </option>
                                      )
                                    )}
                                  </select>
                                </div>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-3">
                                <button
                                  onClick={() => toggleDrink(entry)}
                                  className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                                    entry.drink
                                      ? "bg-amber-700 text-white"
                                      : "border border-zinc-700 text-zinc-300"
                                  }`}
                                >
                                  Bebida {entry.drink ? "✔" : ""}
                                </button>

                                <button
                                  onClick={() => toggleFood(entry)}
                                  className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                                    entry.food
                                      ? "bg-emerald-700 text-white"
                                      : "border border-zinc-700 text-zinc-300"
                                  }`}
                                >
                                  Comida {entry.food ? "✔" : ""}
                                </button>

                                <button
                                  onClick={() => toggleAdminFee(entry)}
                                  className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                                    entry.admin_fee
                                      ? "bg-violet-700 text-white"
                                      : "border border-zinc-700 text-zinc-300"
                                  }`}
                                >
                                  Taxa {entry.admin_fee ? "✔" : ""}
                                </button>
                              </div>

                              <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                                <div className="text-xs uppercase tracking-wide text-zinc-500">
                                  Total do jogador
                                </div>
                                <div className="mt-1 text-xl font-bold text-white">
                                  {formatMoney(entryTotal)}
                                </div>
                                <div className="mt-1 text-xs text-zinc-500">
                                  Poker + participação em bebida/comida/taxa
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
                      <h3 className="text-2xl font-bold text-white">
                        Jogadores disponíveis
                      </h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        Clique para incluir ou remover da etapa.
                      </p>

                      <div className="mt-6 space-y-3">
                        {sortedPlayers.map((player) => {
                          const isInStage = Boolean(
                            selectedStage &&
                              getEntryByPlayer(selectedStage.id, player.id)
                          );

                          return (
                            <div
                              key={player.id}
                              className="flex items-center justify-between rounded-2xl border border-red-900 bg-zinc-950/60 p-4"
                            >
                              <div>
                                <div className="font-bold text-white">{player.apelido}</div>
                                <div className="text-sm text-zinc-400">{player.nome}</div>
                              </div>

                              <button
                                onClick={() => togglePlayerInStage(player)}
                                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                                  isInStage
                                    ? "border border-red-800 text-red-300 hover:bg-red-950/30"
                                    : "bg-red-700 text-white hover:bg-red-600"
                                }`}
                              >
                                {isInStage ? "Remover" : "Incluir"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
                      <h3 className="text-2xl font-bold text-white">Premiação</h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        Campos abertos para divisão livre do prêmio.
                      </p>

                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                          <div className="text-xs text-zinc-500">1º lugar</div>
                          <div className="mt-1 text-lg font-bold text-white">
                            {formatMoney(selectedStage.prize_1)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                          <div className="text-xs text-zinc-500">2º lugar</div>
                          <div className="mt-1 text-lg font-bold text-white">
                            {formatMoney(selectedStage.prize_2)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                          <div className="text-xs text-zinc-500">3º lugar</div>
                          <div className="mt-1 text-lg font-bold text-white">
                            {formatMoney(selectedStage.prize_3)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                          <div className="text-xs text-zinc-500">4º lugar</div>
                          <div className="mt-1 text-lg font-bold text-white">
                            {formatMoney(selectedStage.prize_4)}
                          </div>
                        </div>
                      </div>

                      {selectedStage.prize_notes && (
                        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                          <div className="text-xs text-zinc-500">Observações</div>
                          <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">
                            {selectedStage.prize_notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

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
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                />
                <input
                  value={apelido}
                  onChange={(e) => setApelido(e.target.value)}
                  placeholder="Apelido"
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                />
                <input
                  value={pix}
                  onChange={(e) => setPix(e.target.value)}
                  placeholder="PIX (opcional)"
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                />
              </div>

              <button
                onClick={addPlayer}
                className="mt-4 w-full rounded-2xl bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-600 sm:w-auto"
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
                              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-900"
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => removePlayer(player.id)}
                              className="rounded-xl border border-red-800 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-950/30"
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
                    placeholder="Ex.: Turbo 15 min"
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
                        className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white"
                      />

                      <button
                        onClick={() => removeBlindLevel(level.id)}
                        className="rounded-xl border border-red-800 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-950/30"
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
                  className="rounded-2xl border border-red-800 px-4 py-3 text-sm font-semibold text-white hover:bg-red-950/30"
                >
                  Adicionar nível
                </button>

                <button
                  onClick={saveBlindProfile}
                  disabled={savingBlind}
                  className="rounded-2xl bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-600 disabled:opacity-60"
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
                          className="rounded-xl border border-red-800 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-950/30"
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

        {tab === "ranking" && (
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Ranking geral</h2>
                    <p className="mt-2 text-sm text-zinc-400">
                      Pontuação estilo Fórmula 1 considerando etapas encerradas.
                    </p>
                  </div>
                </div>

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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Ranking por etapa</h2>
                    <p className="mt-2 text-sm text-zinc-400">
                      Resultado individual de uma etapa específica.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-zinc-300">Etapa</label>
                    <select
                      value={rankingStageId}
                      onChange={(e) => setRankingStageId(e.target.value)}
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
                            <td className="px-4 py-4 font-bold">
                              {entry.position}º
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-semibold">{player.apelido}</div>
                              <div className="text-xs text-zinc-500">{player.nome}</div>
                            </td>
                            <td className="px-4 py-4">{pointsForPosition(entry.position)}</td>
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

            <div className="rounded-[28px] border border-red-800 bg-black/80 p-5 shadow-2xl sm:p-6">
              <h3 className="text-xl font-bold text-white">Tabela de pontos</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {Object.entries(F1_POINTS).map(([position, points]) => (
                  <div
                    key={position}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
                  >
                    <div className="text-xs text-zinc-500">{position}º lugar</div>
                    <div className="mt-1 text-lg font-bold text-white">{points} pts</div>
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