"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEALER_PIN = "777";
const PLAYER_PIN = "123";

export default function Home() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleLogin() {
    const cleanPassword = password.trim();

    if (cleanPassword === DEALER_PIN) {
      localStorage.setItem("poker_access_mode", "dealer");
      setError("");
      router.push("/dealer");
      return;
    }

    if (cleanPassword === PLAYER_PIN) {
      localStorage.setItem("poker_access_mode", "player");
      setError("");
      router.push("/player");
      return;
    }

    setError("Senha inválida.");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-red-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[28px] border border-red-800 bg-black/80 p-10 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <img
              src="/logo.png"
              alt="Poker Sanguinário"
              className="mb-4 h-60 w-auto object-contain"
            />

            <h1 className="whitespace-nowrap text-2xl font-bold text-red-500">
              Poker Sanguinário
            </h1>

            <p className="mt-2 text-zinc-300">
              Digite a senha para acessar a liga
            </p>
          </div>

          <div className="mt-6 text-left">
            <label className="text-sm text-zinc-300">Senha da mesa</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogin();
              }}
              placeholder="Dealer ou Player"
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-700"
            />
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            className="mt-6 w-full rounded-xl bg-red-700 py-3 font-bold hover:bg-red-600"
          >
            Entrar
          </button>
        </div>
      </div>
    </main>
  );
}