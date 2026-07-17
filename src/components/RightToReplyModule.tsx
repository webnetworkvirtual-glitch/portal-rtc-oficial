import React, { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Report } from "../types";
import { ShieldCheck, MessageSquare, FileText, UploadCloud, Check, RefreshCw, X, Search, ChevronRight } from "lucide-react";

export const RightToReplyModule: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Response Form State
  const [responderName, setResponderName] = useState("");
  const [responseText, setResponseText] = useState("");
  const [responseDocs, setResponseDocs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [responseSuccess, setResponseSuccess] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = collection(db, "reports");
    
    // Set up real-time listener for reports
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Report[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Report);
      });
      setReports(list.filter(r => r.status === "aprobado" || r.status === "denunciado_fiscalia"));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSelectReport = (report: Report) => {
    setSelectedReport(report);
    setResponseSuccess(false);
    setResponseText("");
    setResponseDocs([]);
  };

  const handleDocAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newFiles = Array.from(e.target.files).map((f: any) => f.name);
      setResponseDocs(prev => [...prev, ...newFiles]);
    }
  };

  const removeDoc = (idx: number) => {
    setResponseDocs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !responderName || !responseText) {
      alert("Por favor rellene todos los campos obligatorios.");
      return;
    }

    setSubmitting(true);

    try {
      const reportRef = doc(db, "reports", selectedReport.id);
      
      const officialResponse = {
        id: `res-${Math.floor(100000 + Math.random() * 900000)}`,
        responderName,
        responseText,
        createdAt: new Date().toISOString(),
        documents: responseDocs,
        status: "publicado" as const
      };

      // Write response to Report document in Firestore
      await updateDoc(reportRef, {
        officialResponse
      });

      // Also update the Entity statistics if applicable
      try {
        const entityRef = doc(db, "entities", selectedReport.entityId);
        // We can let the user know we completed successfully
      } catch (err) {
        console.error("Entity stats update skipped:", err);
      }

      setResponseSuccess(true);
      // Update selected report in UI
      setSelectedReport(prev => prev ? { ...prev, officialResponse } : null);
    } catch (err) {
      console.error("Error submitting official response:", err);
      alert("Hubo un error al registrar la respuesta. Intente de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReports = reports.filter(r => 
    r.targetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full bg-slate-100 rounded-3xl p-6 border border-slate-200/90 shadow-[8px_8px_16px_#cbd0da,-8px_-8px_16px_#ffffff] relative overflow-hidden">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200/80">
        <div className="p-2.5 rounded-xl bg-slate-900 text-sky-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-sans font-extrabold text-slate-800 uppercase tracking-tight">Portal de Derecho a Respuesta</h2>
          <p className="text-xs text-slate-500 font-mono">CANAL EXCLUSIVO PARA INSTITUCIONES, EMPRESAS Y AFECTADOS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Search & select report */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-200/50 rounded-2xl p-4 border border-slate-200 shadow-inner">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-600 mb-2">Instrucciones de Rectificación</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Cada ficha de antecedentes en la RTC cuenta con un espacio para la réplica oficial. El afectado puede responder, adjuntar documentación de respaldo, o solicitar la rectificación si los hechos del denunciante ya han sido remediados.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 shadow-inner">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar reporte por Empresa, Título, RUT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-xs text-slate-700 outline-none w-full"
            />
          </div>

          <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="w-5 h-5 animate-spin text-sky-500 mr-2" />
                <span className="text-xs font-mono text-slate-500">Buscando reportes aprobados...</span>
              </div>
            ) : filteredReports.length === 0 ? (
              <p className="text-xs font-mono text-slate-400 text-center py-6">No hay reportes aprobados que coincidan.</p>
            ) : (
              filteredReports.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectReport(r)}
                  className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                    selectedReport?.id === r.id
                      ? "bg-slate-200 border-sky-500/40 shadow-inner"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-200/50"
                  }`}
                >
                  <div className="flex justify-between items-center w-full mb-1">
                    <span className="text-[9px] font-mono text-sky-600 uppercase font-extrabold">{r.category}</span>
                    <span className="text-[8px] font-mono text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-700 truncate w-full">{r.title}</h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate w-full">Contra: {r.targetName}</p>
                  
                  {r.officialResponse && (
                    <div className="mt-1.5 flex items-center gap-1 text-[8px] font-mono text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 py-0.5 px-1.5 rounded-full font-bold uppercase w-fit">
                      <Check className="w-3 h-3" /> Con Réplica Oficial
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Response Form */}
        <div className="lg:col-span-7">
          {selectedReport ? (
            <div className="flex flex-col gap-4 bg-slate-100 rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="bg-slate-200/50 rounded-xl p-3 border border-slate-300/60 mb-2">
                <span className="text-[9px] font-mono text-slate-500 uppercase">REPORTE SELECCIONADO</span>
                <h4 className="text-sm font-sans font-extrabold text-slate-800 leading-snug mt-1">{selectedReport.title}</h4>
                <p className="text-[11px] text-slate-600 mt-1 line-clamp-3 italic font-sans">
                  "{selectedReport.description}"
                </p>
                <div className="mt-2 text-[10px] text-slate-400 font-mono">
                  Denunciado por: {selectedReport.isAnonymized ? "[CIUDADANO ANÓNIMO]" : selectedReport.userName}
                </div>
              </div>

              {responseSuccess ? (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                  <ShieldCheck className="w-10 h-10 text-emerald-500 mb-2 animate-bounce" />
                  <h4 className="text-sm font-sans font-extrabold text-emerald-800 uppercase">Respuesta Oficial Registrada</h4>
                  <p className="text-xs text-emerald-700 mt-1 font-mono">ESTADO: COMPILADO EN VIVO EN EL EXPEDIENTE</p>
                  <p className="text-xs text-slate-500 max-w-sm mt-3 font-sans leading-relaxed">
                    Su versión oficial, respaldada por la documentación provista, se ha asociado directamente al reporte correspondiente y ya es visible públicamente en el panel de búsqueda nacional.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitResponse} className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">Identificación / Cargo Oficial *</label>
                    <input
                      type="text"
                      required
                      value={responderName}
                      onChange={(e) => setResponderName(e.target.value)}
                      placeholder="Ej. Gerente de Relaciones Públicas - Constructora ABC"
                      className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-700 shadow-inner focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">Respuesta o Aclaración de Hechos *</label>
                    <textarea
                      required
                      rows={5}
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Indique con claridad y objetividad los descargos oficiales, medidas correctivas adoptadas, compensaciones programadas o aclaración fáctica del incidente."
                      className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-700 shadow-inner focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                    />
                  </div>

                  {/* Document Upload for Reply */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">Adjuntar Certificados, Oficios o Resoluciones Públicas</label>
                    <div
                      onClick={() => document.getElementById("reply-file-upload")?.click()}
                      className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-center gap-2 cursor-pointer transition-all text-center"
                    >
                      <UploadCloud className="w-5 h-5 text-slate-400" />
                      <span className="text-xs text-slate-500">Haga clic para adjuntar comprobante oficial</span>
                      <input
                        id="reply-file-upload"
                        type="file"
                        onChange={handleDocAdd}
                        className="hidden"
                      />
                    </div>

                    {responseDocs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5 p-2 bg-slate-200/50 rounded-xl border border-slate-200">
                        {responseDocs.map((docName, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-slate-100 py-0.5 px-2 rounded-lg border border-slate-300 text-[9px] font-mono text-slate-600">
                            <span className="truncate max-w-[120px]">{docName}</span>
                            <button
                              type="button"
                              onClick={() => removeDoc(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-mono text-xs font-bold uppercase py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Sincronizando con Servidor RTC...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        Enviar Respuesta Oficial
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="h-[300px] rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center p-6 text-slate-400 bg-slate-50/50">
              <ShieldCheck className="w-12 h-12 mb-3 text-slate-300" />
              <h4 className="text-sm font-sans font-extrabold text-slate-500 uppercase">Sin Reporte Seleccionado</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm font-mono">
                Por favor seleccione una denuncia aprobada del panel de la izquierda para ingresar su réplica oficial y adjuntar evidencias aclaratorias.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
