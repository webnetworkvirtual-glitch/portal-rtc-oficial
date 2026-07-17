import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, increment, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Entity, Report } from "../types";
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  Send, 
  AlertCircle, 
  ArrowRight, 
  Check, 
  HelpCircle,
  TrendingUp,
  Award,
  RefreshCw,
  Download,
  X,
  ShieldCheck
} from "lucide-react";

interface CompanyDashboardProps {
  currentUser: { email: string; isPremium: boolean; plan: string } | null;
}

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({ currentUser }) => {
  const [companies, setCompanies] = useState<Entity[]>([]);
  const [claimedCompany, setClaimedCompany] = useState<Entity | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [replyTexts, setReplyTexts] = useState<{ [reportId: string]: string }>({});
  const [submittingReply, setSubmittingReply] = useState<{ [reportId: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<{ [reportId: string]: string }>({});
  const [showCertificate, setShowCertificate] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fetch verified companies of type "empresa" to let user claim one
  useEffect(() => {
    const q = query(collection(db, "entities"), where("type", "==", "empresa"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: Entity[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Entity);
      });
      setCompanies(list);

      // Auto claim if email domain matches or if there's any claim history in localStorage for demo
      const claimedId = localStorage.getItem(`claimed_company_${currentUser?.email}`);
      if (claimedId) {
        const found = list.find(c => c.id === claimedId);
        if (found) setClaimedCompany(found);
      } else {
        // Simple domain matching fallback, e.g. email of form "contacto@bancodigital.cl" matches domain "bancodigital.cl"
        if (currentUser?.email) {
          const domain = currentUser.email.split("@")[1];
          const matched = list.find(c => c.domain === domain || c.email?.includes(domain));
          if (matched) {
            setClaimedCompany(matched);
            localStorage.setItem(`claimed_company_${currentUser.email}`, matched.id);
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch reports for the claimed company
  useEffect(() => {
    if (!claimedCompany) {
      setReports([]);
      return;
    }

    const q = query(collection(db, "reports"), where("entityId", "==", claimedCompany.id));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: Report[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Report);
      });
      // Sort reports by date (newest first)
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReports(list);
    });

    return () => unsubscribe();
  }, [claimedCompany]);

  const handleClaimCompany = (companyId: string) => {
    const found = companies.find(c => c.id === companyId);
    if (found && currentUser) {
      setClaimedCompany(found);
      localStorage.setItem(`claimed_company_${currentUser.email}`, found.id);
    }
  };

  const handleReleaseClaim = () => {
    if (currentUser) {
      setClaimedCompany(null);
      localStorage.removeItem(`claimed_company_${currentUser.email}`);
    }
  };

  const handleExportCSV = () => {
    if (!claimedCompany || reports.length === 0) return;
    setExporting(true);
    
    try {
      // Create CSV content
      const headers = ["ID de Reporte", "Fecha de Creación", "Categoría", "Título", "Detalle de la Denuncia", "Estado", "Respuesta Oficial", "Fecha de Respuesta"];
      const rows = reports.map(r => [
        r.id,
        new Date(r.createdAt).toLocaleDateString("es-CL"),
        r.category,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.description.replace(/"/g, '""')}"`,
        r.officialResponse ? "Respondido" : "Pendiente de Réplica",
        r.officialResponse ? `"${r.officialResponse.responseText.replace(/"/g, '""')}"` : "Ninguna",
        r.officialResponse ? new Date(r.officialResponse.createdAt).toLocaleDateString("es-CL") : "N/A"
      ]);
      
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `reporte_denuncias_${claimedCompany.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error exporting CSV:", err);
    } finally {
      setTimeout(() => setExporting(false), 800);
    }
  };

  const handlePublishReply = async (reportId: string, e: React.FormEvent) => {
    e.preventDefault();
    const replyText = replyTexts[reportId]?.trim();
    if (!replyText || !claimedCompany) return;

    setSubmittingReply(prev => ({ ...prev, [reportId]: true }));

    try {
      // 1. Update the report document in Firestore with the official reply
      const reportRef = doc(db, "reports", reportId);
      const officialResponse = {
        id: `resp-${Math.floor(Math.random() * 900000 + 100000)}`,
        responderName: `Director de Relaciones con Clientes - ${claimedCompany.name}`,
        responseText: replyText,
        createdAt: new Date().toISOString(),
        status: "publicado" as const
      };

      await updateDoc(reportRef, {
        officialResponse: officialResponse
      });

      // 2. Increment the resolved reports counter in the entities collection
      const entityRef = doc(db, "entities", claimedCompany.id);
      await updateDoc(entityRef, {
        resolvedReports: increment(1)
      });

      // 3. Trigger success message
      setSuccessMsg(prev => ({ ...prev, [reportId]: "¡Réplica oficial publicada y firmada digitalmente!" }));
      setReplyTexts(prev => ({ ...prev, [reportId]: "" }));
      
      setTimeout(() => {
        setSuccessMsg(prev => ({ ...prev, [reportId]: "" }));
      }, 3000);

    } catch (err) {
      console.error("Error publishing response:", err);
      alert("No se pudo publicar la réplica. Intente nuevamente.");
    } finally {
      setSubmittingReply(prev => ({ ...prev, [reportId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-3xl p-6 border border-slate-950 shadow-2xl relative overflow-hidden text-white mt-4">
      {/* Absolute design guides */}
      <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-slate-800 border border-slate-700"></div>
      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-800 border border-slate-700"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
        <div>
          <span className="text-[9px] font-mono tracking-wider font-bold text-orange-400 uppercase bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full">
            Herramientas Corporativas Premium
          </span>
          <h3 className="text-sm font-sans font-extrabold uppercase text-slate-100 tracking-tight mt-2 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-orange-500 animate-pulse" />
            Consola de Gestión Corporativa & Derecho a Réplica
          </h3>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
            Administre la reputación y responda oficialmente a sus clientes
          </p>
        </div>

        {claimedCompany && (
          <button
            onClick={handleReleaseClaim}
            className="text-[9px] font-mono font-bold uppercase tracking-wider py-1 px-3 rounded-lg border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-400/40 transition-all cursor-pointer"
          >
            Vincular otra empresa
          </button>
        )}
      </div>

      {!claimedCompany ? (
        /* CLAIM STATE: CHOOSE COMPANY */
        <div className="bg-slate-950/40 rounded-2xl p-6 border border-slate-800/60 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-center text-orange-400 mb-3.5 shadow-lg">
            <Building2 className="w-6 h-6 animate-bounce" />
          </div>
          <h4 className="text-xs font-sans font-extrabold text-slate-200 uppercase tracking-tight">
            Vincule su Cuenta con una Entidad Registrada
          </h4>
          <p className="text-[11px] text-slate-400 font-sans mt-1.5 max-w-sm mx-auto leading-relaxed">
            Para publicar un <strong>Derecho a Réplica</strong> con validez jurídica y firma institucional, seleccione cuál de las empresas representadas en nuestra Red le pertenece.
          </p>

          <div className="w-full max-w-xs mt-5">
            <label className="text-[9px] font-mono uppercase text-slate-500 font-bold block text-left mb-1.5">
              Seleccionar Entidad Corporativa:
            </label>
            <select
              onChange={(e) => handleClaimCompany(e.target.value)}
              defaultValue=""
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans"
            >
              <option value="" disabled>-- Seleccione su Empresa --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.rut || "Sin RUT"})
                </option>
              ))}
            </select>
          </div>

          <p className="text-[9.5px] text-slate-500 font-sans mt-3">
            ¿Su empresa no aparece? Registre un ticket de soporte con nuestro equipo de verificación premium para darla de alta en menos de 24 horas.
          </p>
        </div>
      ) : (
        /* DASHBOARD STATE */
        <div className="space-y-6">
          {/* Active claim header banner */}
          <div className="bg-slate-850 rounded-2xl p-4 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-mono uppercase text-slate-400 leading-none">EMPRESA VINCULADA</span>
                <span className="text-xs font-sans font-extrabold text-white uppercase tracking-tight mt-1 leading-tight">
                  {claimedCompany.name}
                </span>
                <span className="text-[9.5px] font-mono text-slate-400 mt-0.5">
                  RUT: {claimedCompany.rut || "No especificado"} • Dominio: {claimedCompany.domain || "Ninguno"}
                </span>
              </div>
            </div>

            {/* Corporate Metrics display inside the company dashboard */}
            <div className="flex gap-4 border-l border-slate-800 pl-4 sm:pl-6">
              <div className="flex flex-col text-right">
                <span className="text-[8.5px] font-mono text-slate-400 uppercase">RECLAMOS TOTALES</span>
                <span className="text-sm font-mono font-extrabold text-white">{reports.length}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[8.5px] font-mono text-slate-400 uppercase">RESPUESTAS</span>
                <span className="text-sm font-mono font-extrabold text-emerald-400">
                  {reports.filter(r => r.officialResponse).length}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[8.5px] font-mono text-slate-400 uppercase">TASA RESOLUCIÓN</span>
                <span className="text-sm font-mono font-extrabold text-orange-500">
                  {reports.length > 0 
                    ? Math.round((reports.filter(r => r.officialResponse).length / reports.length) * 100) 
                    : 100
                  }%
                </span>
              </div>
            </div>
          </div>

          {/* Herramientas de Empresa Premium */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-extrabold mb-2">
                Estado y Reputación Corporativa
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-sans text-slate-300">
                  <span>Sello de Transparencia RTC:</span>
                  <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    ACTIVO Y VERIFICADO
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-sans text-slate-300">
                  <span>Nivel de Cooperación:</span>
                  <span className="font-mono text-white font-bold bg-orange-500/10 border border-orange-500/20 py-0.5 px-2 rounded-full text-[10px]">
                    {reports.length > 0 && reports.filter(r => r.officialResponse).length === reports.length ? "EXCELENTE" : "EN DESARROLLO"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-sans text-slate-300">
                  <span>Reclamaciones Pendientes:</span>
                  <span className={`font-mono font-bold ${reports.filter(r => !r.officialResponse).length > 0 ? "text-amber-400" : "text-slate-400"}`}>
                    {reports.filter(r => !r.officialResponse).length} Casos
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-2">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-1 md:hidden">
                Acciones Premium
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={handleExportCSV}
                  disabled={exporting || reports.length === 0}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-mono text-[9px] font-extrabold uppercase py-2.5 px-3 rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  {exporting ? "Exportando..." : "Descargar Excel (CSV)"}
                </button>
                <button
                  onClick={() => setShowCertificate(true)}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-mono text-[9px] font-extrabold uppercase py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
                >
                  <Award className="w-4 h-4" />
                  Ver Certificado Oficial
                </button>
              </div>
            </div>
          </div>

          {/* List of complaints targeting this company */}
          <div className="space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-wider font-extrabold text-slate-300">
              Reportes Públicos de Clientes ({reports.length})
            </h4>

            {reports.length === 0 ? (
              <div className="bg-slate-950/30 p-8 rounded-2xl border border-slate-800/40 text-center text-slate-500 text-xs font-sans">
                No hay denuncias activas contra su empresa en este momento. ¡Siga así con el buen servicio al cliente!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {reports.map((rep) => (
                  <div 
                    key={rep.id} 
                    className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                          <h5 className="text-[11.5px] font-sans font-extrabold text-white tracking-tight leading-snug">
                            {rep.title}
                          </h5>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8.5px] font-mono uppercase py-0.5 px-1.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {rep.category}
                            </span>
                            <span className="text-[8.5px] font-mono text-slate-500">
                              {new Date(rep.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {rep.officialResponse ? (
                          <span className="text-[8px] font-mono uppercase py-0.5 px-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3" />
                            Respondido
                          </span>
                        ) : (
                          <span className="text-[8px] font-mono uppercase py-0.5 px-2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold flex items-center gap-1 shrink-0 animate-pulse">
                            <Clock className="w-3 h-3" />
                            Pendiente Réplica
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-300 font-sans leading-relaxed italic border-l-2 border-slate-700 pl-3.5 my-3.5">
                        "{rep.description}"
                      </p>
                    </div>

                    {/* Official response slot */}
                    {rep.officialResponse ? (
                      <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-3 mt-1 text-slate-200">
                        <div className="flex justify-between items-center mb-1 text-[8.5px] font-mono">
                          <span className="text-emerald-400 font-extrabold uppercase flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Réplica Institucional Publicada
                          </span>
                          <span className="text-slate-500">
                            {new Date(rep.officialResponse.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] font-sans italic leading-relaxed text-slate-300">
                          "{rep.officialResponse.responseText}"
                        </p>
                        <span className="text-[8.5px] text-emerald-500 font-mono block mt-1.5 leading-none">
                          Firmado: {rep.officialResponse.responderName}
                        </span>
                      </div>
                    ) : (
                      /* Reply Form if none exists */
                      <form 
                        onSubmit={(e) => handlePublishReply(rep.id, e)} 
                        className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2.5 mt-2.5"
                      >
                        <div className="flex justify-between items-center">
                          <label className="text-[8.5px] font-mono uppercase text-orange-400 font-extrabold flex items-center gap-1">
                            <Send className="w-3.5 h-3.5" />
                            Redactar Derecho a Réplica Oficial
                          </label>
                          <span className="text-[8.5px] text-slate-500 font-mono">
                            Firmado como: Director de Relaciones con Clientes
                          </span>
                        </div>

                        <textarea
                          required
                          value={replyTexts[rep.id] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReplyTexts(prev => ({ ...prev, [rep.id]: val }));
                          }}
                          placeholder="Escriba aquí la declaración o respuesta institucional sobre los hechos reportados..."
                          rows={2}
                          className="bg-slate-900/60 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 w-full resize-none font-sans"
                        />

                        {successMsg[rep.id] && (
                          <div className="text-[10px] text-emerald-400 font-sans font-bold py-1 px-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {successMsg[rep.id]}
                          </div>
                        )}

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={submittingReply[rep.id] || !replyTexts[rep.id]?.trim()}
                            className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-mono text-[9px] font-extrabold uppercase py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:border disabled:border-slate-700"
                          >
                            {submittingReply[rep.id] ? "Enviando..." : "Publicar Réplica"}
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Verification Certificate Modal */}
      {showCertificate && claimedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-950 border border-amber-500/40 rounded-3xl max-w-2xl w-full p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.15)] relative overflow-hidden">
            {/* Corner ornaments for institutional layout */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-500/30 rounded-tl-3xl m-3"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-500/30 rounded-tr-3xl m-3"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-amber-500/30 rounded-bl-3xl m-3"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-500/30 rounded-br-3xl m-3"></div>
            
            <button
              onClick={() => setShowCertificate(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-900 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Certificate Header */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/50 flex items-center justify-center text-amber-500 mb-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 font-extrabold">
                Sello de Transparencia Activa
              </span>
              <h3 className="text-base font-sans font-extrabold uppercase text-slate-100 tracking-tight mt-1">
                Certificado de Cumplimiento Reputacional
              </h3>
              <p className="text-[9px] text-slate-500 font-mono mt-0.5 uppercase">
                Otorgado por la Red de Transparencia Ciudadana de Chile
              </p>
            </div>

            {/* Certificate Body */}
            <div className="border-t border-b border-slate-800/80 py-5 my-4 space-y-4">
              <p className="text-xs font-sans text-slate-300 leading-relaxed max-w-lg mx-auto">
                Se certifica formalmente que la entidad corporativa registrada como
              </p>
              
              <div className="my-2">
                <span className="text-base font-sans font-black text-white uppercase tracking-tight block">
                  {claimedCompany.name}
                </span>
                <span className="text-xs font-mono text-amber-500 font-bold block mt-1">
                  RUT: {claimedCompany.rut || "VERIFICADO"}
                </span>
              </div>

              <p className="text-[11px] font-sans text-slate-400 leading-relaxed max-w-lg mx-auto italic">
                "Ha habilitado su canal de Derecho a Réplica Institucional y mantiene una participación activa en la resolución de controversias y aclaración de denuncias ciudadanas de manera oportuna, transparente y con validez jurídica."
              </p>

              {/* Certificate metrics info */}
              <div className="flex justify-center gap-10 mt-4 pt-2">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Tasa de Respuesta</span>
                  <span className="text-base font-mono font-black text-emerald-400">
                    {reports.length > 0 
                      ? Math.round((reports.filter(r => r.officialResponse).length / reports.length) * 100) 
                      : 100
                    }%
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Nivel de Verificación</span>
                  <span className="text-sm font-mono font-black text-amber-500 flex items-center gap-0.5 mt-0.5">
                    Premium <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0 inline" />
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Fecha de Emisión</span>
                  <span className="text-xs font-mono font-bold text-slate-300 mt-1">
                    {new Date().toLocaleDateString("es-CL")}
                  </span>
                </div>
              </div>
            </div>

            {/* Certificate Footer */}
            <div className="flex justify-between items-center text-[8px] font-mono text-slate-500 uppercase pt-2">
              <span>ID de Registro: TC-{claimedCompany.id.toUpperCase()}</span>
              <span>Firma Electrónica Avanzada: RTC-VERIFIED-SECURE</span>
            </div>

            <div className="mt-6">
              <button
                onClick={() => window.print()}
                className="bg-slate-900 hover:bg-slate-800 text-white font-mono text-[9px] font-extrabold uppercase py-2 px-5 rounded-xl border border-slate-700 cursor-pointer transition-all shadow"
              >
                Imprimir o Guardar como PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
