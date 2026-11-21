"use client";
import { Download } from "lucide-react";
import StatsPanel from "@/components/StatsPanel";

export default function StatsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
        <h1>Statystyki</h1>
        <p className="text-muted">Anonimowe liczniki kategorii – pomagają wskazać, gdzie rodzice najczęściej się gubią i tracą świadczenia.</p>
        </div>
        <a href="/api/admin/export?type=stats" className="btn-ghost !py-1.5 text-sm"><Download size={15} /> Eksport CSV</a>
      </div>
      <StatsPanel />
    </div>
  );
}
