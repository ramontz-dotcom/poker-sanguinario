"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "../../components/AppShell";
import { supabase } from "../../lib/supabase";

type Player = {
  id: string;
  nome: string;
  apelido: string;
  pix: string | null;
};

export default function DealerPage() {
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [pix, setPix] = useState("");

  useEffect(() => {
    const mode = localStorage.getItem("poker_access_mode");

    if (mode !== "dealer") {
      router.push("/");
      return;
    }

    loadPlayers();
  }, [router]);

  async function loadPlayers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("players")
      .select("id, nome, apelido, pix")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar jogadores:", error);
      alert("Erro ao carregar jogadores no Supabase.");
      setLoading(false);
      return;
    }

    setPlayers(data || []);
    setLoading(false);
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
    loadPlayers();
  }

  async function removePlayer(playerId: string) {
    const { error } = await supabase.from("players").delete().eq("id", playerId);

    if (error) {
      console.error("Erro ao remover jogador:", error);
      alert("Erro ao remover jogador.");
      return;
    }

    loadPlayers();
  }

  return (
    <AppShell role="dealer" onLogout={handleLogout}>
      <div className="space-y-6">
        <div className="rounded-[28px] border border-red-800 bg-black/80 p-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-white">Cadastro de jogadores</h2>
          <p className="mt-2 text-zinc-400">
            Agora os jogadores são salvos online no Supabase.
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
            {loading && <p className="text-zinc-400">Carregando jogadores...</p>}

            {!loading && players.length === 0 && (
              <p className="text-zinc-400">Nenhum jogador cadastrado ainda.</p>
            )}

            {!loading &&
              players.map((player) => (
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
    </AppShell>
  );
}
