"use client";
import StatsPanel from "@/components/StatsPanel";

export default function StatsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Statystyki</h1>
        <p className="text-muted">Anonimowe liczniki kategorii – pomagają wskazać, gdzie rodzice najczęściej się gubią i tracą świadczenia.</p>
      </div>
      <StatsPanel />
    </div>
  );
}
