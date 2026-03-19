"use client";

type ProtectedPageProps = {
  title: string;
  description?: string;
};

export default function ProtectedPage({
  title,
  description = "Página em construção. Vamos montar esta parte na próxima etapa.",
}: ProtectedPageProps) {
  return (
    <div className="rounded-[28px] border border-red-800 bg-black/80 p-8 shadow-2xl">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="mt-3 text-zinc-400">{description}</p>

      <div className="mt-6 rounded-2xl border border-red-900 bg-zinc-950/70 p-6">
        <p className="text-zinc-300">
          Estrutura criada com sucesso. Agora vamos evoluir esta tela.
        </p>
      </div>
    </div>
  );
}