"use client";
import { useAdmin } from "@/components/admin/AdminContext";

export default function HistoryPage() {
  const { saved } = useAdmin();
  const history = saved?.history ?? [];
  return (
    <div className="space-y-6">
      <div>
        <h1>Historia zmian</h1>
        <p className="text-muted">Audyt: kto, kiedy i na jakiej podstawie zmienił parametry (ostatnie 50 zmian).</p>
      </div>
      {!saved ? (
        <div className="card h-40 animate-pulse" />
      ) : !history.length ? (
        <p className="card text-sm text-muted">Brak zmian – obowiązują wartości domyślne (stan prawny 2026).</p>
      ) : (
        <ol className="relative ml-3 space-y-4 border-l-2 border-slate-200">
          {history.map((h, i) => (
            <li key={i} className="relative pl-6">
              <span className="absolute -left-[9px] top-5 h-4 w-4 rounded-full border-2 border-white bg-[#123a5c]" />
              <div className="card !p-4">
                <p className="font-semibold">{new Date(h.at).toLocaleString("pl-PL")} · v{h.version}</p>
                <p className="mb-2 text-sm text-muted">{h.note || "bez opisu"}</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead className="text-left text-xs text-muted"><tr><th className="py-1">Pole</th><th>Było</th><th>Jest</th></tr></thead>
                    <tbody>
                      {h.changes.map((c) => (
                        <tr key={c.path} className="border-t border-slate-100">
                          <td className="py-1.5 font-mono text-xs">{c.path}</td>
                          <td className="text-red-700 line-through">{JSON.stringify(c.from)}</td>
                          <td className="font-semibold text-brand">{JSON.stringify(c.to)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
