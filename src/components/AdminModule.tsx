import React, { useState, useEffect } from "react";
import { collection, updateDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Report, ReportStatus, PatternAnalysisResult } from "../types";
import { 
  Settings, ShieldCheck, AlertOctagon, Check, X, FileText, Sparkles, RefreshCw, 
  AlertTriangle, LogOut, DollarSign, CreditCard, Lock, Scale, MessageSquare, Send, CheckCircle 
} from "lucide-react";

interface AdminModuleProps {
  onAdminLogout: () => void;
}

export const AdminModule: React.FC<AdminModuleProps> = ({ onAdminLogout }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Admin section navigation tab
  const [adminTab, setAdminTab] = useState<"moderation" | "payments">("moderation");

  // Selected Report AI tab (Pattern analysis or Señorita IA Compliance Analyser)
  const [selectedAiTool, setSelectedAiTool] = useState<"patrones" | "senorita_ia">("patrones");

  // AI Pattern Analysis State
  const [analyzingPatterns, setAnalyzingPatterns] = useState(false);
  const [patternResult, setPatternResult] = useState<PatternAnalysisResult | null>(null);

  // Señorita IA legal auditor states
  const [analyzingLegal, setAnalyzingLegal] = useState(false);
  const [legalResult, setLegalResult] = useState<any>(null);

  // Interactive chat states
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "model"; text: string }>>([]);
  const [sendingChat, setSendingChat] = useState(false);

  // Payment Credential Settings states
  const [flowActive, setFlowActive] = useState(true);
  const [flowComercio, setFlowComercio] = useState("95284");
  const [flowSecret, setFlowSecret] = useState("f62e8461ab1c9d81e187b8d65421a1f4");
  const [flowLinkCiudadano, setFlowLinkCiudadano] = useState("https://www.flow.cl/uri/n0b12Zj9T");
  const [flowLinkPeriodista, setFlowLinkPeriodista] = useState("https://www.flow.cl/uri/Lbx1Q70Lg");
  const [flowLinkEmpresa, setFlowLinkEmpresa] = useState("https://www.flow.cl/uri/TCp4VBjs3");
  const [flowLinkMunicipio, setFlowLinkMunicipio] = useState("https://www.flow.cl/uri/ZNkK6NGwm");

  const [stripeActive, setStripeActive] = useState(true);
  const [stripePublic, setStripePublic] = useState("pk_test_51Oq8rTH...982x");
  const [stripeSecret, setStripeSecret] = useState("sk_test_51Oq8rTH...a9a1");

  const [mpActive, setMpActive] = useState(true);
  const [mpPublic, setMpPublic] = useState("APP_USR-7e284a1-0291");
  const [mpSecret, setMpSecret] = useState("TEST-84920491840-0291-a18d");

  const [savingConfig, setSavingConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Moderation state
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  // Subscribe to live reports queue
  useEffect(() => {
    setLoading(true);
    const q = collection(db, "reports");
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Report[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Report);
      });
      setReports(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to live payment gateway config
  useEffect(() => {
    const configRef = doc(db, "config", "payment");
    const unsubscribe = onSnapshot(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setFlowActive(data.flowActive !== false);
        setFlowComercio(data.flowComercio || "");
        setFlowSecret(data.flowSecret || "");
        setFlowLinkCiudadano(data.flowLinkCiudadano || "");
        setFlowLinkPeriodista(data.flowLinkPeriodista || "");
        setFlowLinkEmpresa(data.flowLinkEmpresa || "");
        setFlowLinkMunicipio(data.flowLinkMunicipio || "");
        setStripeActive(data.stripeActive !== false);
        setStripePublic(data.stripePublic || "");
        setStripeSecret(data.stripeSecret || "");
        setMpActive(data.mercadopagoActive !== false);
        setMpPublic(data.mercadopagoPublic || "");
        setMpSecret(data.mercadopagoSecret || "");
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (reportId: string, newStatus: ReportStatus) => {
    setModeratingId(reportId);
    try {
      const reportRef = doc(db, "reports", reportId);
      await updateDoc(reportRef, {
        status: newStatus,
        isModerated: true
      });
      
      // Update selected report in UI
      if (selectedReport?.id === reportId) {
        setSelectedReport(prev => prev ? { ...prev, status: newStatus, isModerated: true } : null);
      }
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Hubo un error al moderar el reporte. Intente de nuevo.");
    } finally {
      setModeratingId(null);
    }
  };

  const handleAnalyzePatterns = async () => {
    if (!selectedReport) return;
    setAnalyzingPatterns(true);
    setPatternResult(null);

    // Grab all reports for the same target entity to search for duplicates or campaigns
    const sameEntityReports = reports.filter(r => r.entityId === selectedReport.entityId);

    try {
      const response = await fetch("/api/detect-patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetName: selectedReport.targetName,
          recentReports: sameEntityReports
        })
      });

      const data = await response.json();
      if (response.ok) {
        setPatternResult(data);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error(err);
      // Fallback response
      setPatternResult({
        hasSuspiciousPatterns: sameEntityReports.length > 2,
        patternType: sameEntityReports.length > 2 ? "Campañas Coordinadas" : "Ninguno",
        severity: sameEntityReports.length > 2 ? "Media" : "Ninguna",
        analysisSummary: "El análisis automático detectó reportes recurrentes en la base de datos local para esta entidad.",
        recommendations: [
          "Verificar de forma documental las facturas y boletas adjuntas.",
          "Establecer comunicación directa con el departamento de relaciones públicas de la empresa."
        ]
      });
    } finally {
      setAnalyzingPatterns(false);
    }
  };

  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setSaveSuccess(false);

    try {
      const configRef = doc(db, "config", "payment");
      await setDoc(configRef, {
        flowActive,
        flowComercio,
        flowSecret,
        flowLinkCiudadano,
        flowLinkPeriodista,
        flowLinkEmpresa,
        flowLinkMunicipio,
        stripeActive,
        stripePublic,
        stripeSecret,
        mercadopagoActive: mpActive,
        mercadopagoPublic: mpPublic,
        mercadopagoSecret: mpSecret,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving payment config:", err);
      alert("Error al guardar la configuración de pasarelas.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAnalyzeLegal = async () => {
    if (!selectedReport) return;
    setAnalyzingLegal(true);
    setLegalResult(null);

    try {
      const response = await fetch("/api/admin/analyze-legal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedReport.title,
          description: selectedReport.description,
          category: selectedReport.category,
          targetName: selectedReport.targetName,
          evidenceDocuments: selectedReport.evidenceDocuments || []
        })
      });

      const data = await response.json();
      if (response.ok) {
        setLegalResult(data);
        // Pre-populate chat history with a nice opening greeting based on analysis
        setChatHistory([
          {
            role: "model",
            text: `¡Hola mi estimado administrador! He revisado con lupa el expediente de la denuncia contra "${selectedReport.targetName}".\n\nMi veredicto legal es: **${data.verdict}**.\n\n*   **Ley 19.628 (Privacidad)**: El dictamen es **${data.chileanLawCompliance?.ley19628?.status}** (${data.chileanLawCompliance?.ley19628?.details})\n*   **Ley 19.733 (Ley de Prensa)**: El dictamen es **${data.chileanLawCompliance?.ley19733?.status}** (${data.chileanLawCompliance?.ley19733?.details})\n\n¿Tienes alguna duda sobre qué artículos aplicar, cómo anonimizar datos o de qué manera proceder civil o penalmente en los tribunales chilenos? ¡Pregúntame con confianza! ♥`
          }
        ]);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error(err);
      alert("Error al invocar el dictamen legal de la Señorita IA.");
    } finally {
      setAnalyzingLegal(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || sendingChat) return;

    const userMsg = chatMessage;
    setChatMessage("");
    setChatHistory(prev => [...prev, { role: "user", text: userMsg }]);
    setSendingChat(true);

    try {
      const response = await fetch("/api/admin/chat-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          contextReport: selectedReport,
          chatHistory: chatHistory.map(h => ({
            role: h.role,
            text: h.text
          }))
        })
      });

      const data = await response.json();
      if (response.ok) {
        setChatHistory(prev => [...prev, { role: "model", text: data.text }]);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [
        ...prev,
        {
          role: "model",
          text: "Mil disculpas, mi estimado administrador. Tuve un pequeño contratiempo en mis servidores de Santiago, pero sigo 100% atenta a tus órdenes sobre la legislación chilena. ¿Me repites tu consulta por favor?"
        }
      ]);
    } finally {
      setSendingChat(false);
    }
  };

  // Sort reports: Pending first, then by date descending
  const sortedReports = [...reports].sort((a, b) => {
    if (a.status === "pendiente" && b.status !== "pendiente") return -1;
    if (a.status !== "pendiente" && b.status === "pendiente") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="w-full bg-slate-100 rounded-3xl p-6 border border-slate-200/90 shadow-[8px_8px_16px_#cbd0da,-8px_-8px_16px_#ffffff] relative overflow-hidden">
      {/* Header with Switcher & Logout */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 text-purple-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-sans font-extrabold text-slate-800 uppercase tracking-tight">Consola de Operaciones RTC</h2>
            <p className="text-xs text-slate-500 font-mono">PANEL EXCLUSIVO PARA ADMINISTRADORES DE TRANSPARENCIA</p>
          </div>
        </div>

        {/* Tab Switcher and Close button */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAdminTab("moderation")}
            className={`px-3.5 py-2 rounded-xl font-mono text-[10px] uppercase font-bold tracking-wider border transition-all cursor-pointer ${
              adminTab === "moderation"
                ? "bg-slate-900 text-purple-400 border-slate-950 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-200/50"
            }`}
          >
            ⚖️ Moderación de Denuncias
          </button>
          
          <button
            onClick={() => setAdminTab("payments")}
            className={`px-3.5 py-2 rounded-xl font-mono text-[10px] uppercase font-bold tracking-wider border transition-all cursor-pointer ${
              adminTab === "payments"
                ? "bg-slate-900 text-purple-400 border-slate-950 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-200/50"
            }`}
          >
            💳 Configuración de Pasarelas
          </button>

          <button
            onClick={onAdminLogout}
            className="px-3.5 py-2 rounded-xl font-mono text-[10px] uppercase font-bold tracking-wider border bg-rose-500/10 text-rose-700 border-rose-300 hover:bg-rose-500/20 transition-all flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Panel [X]
          </button>
        </div>
      </div>

      {adminTab === "moderation" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Side: Queued Reports List */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Cola de Moderación Reciente</span>
            
            <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="w-5 h-5 animate-spin text-purple-500 mr-2" />
                  <span className="text-xs font-mono text-slate-500">Consultando base de datos...</span>
                </div>
              ) : sortedReports.length === 0 ? (
                <p className="text-xs font-mono text-slate-400 text-center py-8 bg-slate-50 rounded-2xl border border-slate-200">
                  No hay denuncias registradas en la plataforma.
                </p>
              ) : (
                sortedReports.map((r) => {
                  const isPending = r.status === "pendiente";
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedReport(r);
                        setPatternResult(null);
                        setLegalResult(null);
                        setChatHistory([]);
                      }}
                      className={`flex flex-col text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        selectedReport?.id === r.id
                          ? "bg-slate-200 border-purple-500/40 shadow-inner"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-200/40"
                      }`}
                    >
                      <div className="flex justify-between items-center w-full mb-1">
                        <span className="text-[9px] font-mono font-bold text-slate-400">ID: {r.id}</span>
                        <span className={`text-[8px] font-mono py-0.5 px-1.5 rounded-full uppercase font-bold border ${
                          isPending
                            ? "bg-amber-500/10 text-amber-600 border-amber-300 animate-pulse"
                            : r.status === "aprobado"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-300"
                            : r.status === "denunciado_fiscalia"
                            ? "bg-red-500/10 text-red-600 border-red-300"
                            : "bg-slate-500/10 text-slate-500 border-slate-300"
                        }`}>
                          {r.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-700 truncate w-full">{r.title}</h4>
                      <p className="text-[10px] text-slate-500 font-mono truncate w-full">Empresa: {r.targetName}</p>
                      <p className="text-[9px] text-slate-400 font-sans mt-1 leading-snug">
                        Relatado por: {r.userEmail}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Side: Detailed report moderation control & AI patterns */}
          <div className="lg:col-span-7">
            {selectedReport ? (
              <div className="flex flex-col gap-4 bg-slate-100 rounded-2xl p-5 border border-slate-200 shadow-sm">
                
                {/* Detailed Report Block */}
                <div className="bg-slate-200/50 rounded-xl p-4 border border-slate-300/60 relative">
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">EXPEDIENTE COMPLETO</span>
                  <h4 className="text-sm font-sans font-extrabold text-slate-800 leading-snug mt-1">{selectedReport.title}</h4>
                  
                  <div className="flex items-center gap-2 mt-1 mb-3">
                    <span className="text-[9px] font-mono bg-slate-900 text-orange-400 py-0.5 px-1.5 rounded font-bold uppercase">
                      {selectedReport.category}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">
                      Sincronización: {new Date(selectedReport.createdAt).toLocaleString("es-CL")}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-sans bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-inner">
                    "{selectedReport.description}"
                  </p>

                  {/* Evidence documents list */}
                  {selectedReport.evidenceDocuments && selectedReport.evidenceDocuments.length > 0 && (
                    <div className="mt-3">
                      <span className="text-[9px] font-mono text-slate-400 uppercase block mb-1">EVIDENCIAS ADJUNTAS:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedReport.evidenceDocuments.map((docName, idx) => (
                          <span key={idx} className="bg-slate-200 py-0.5 px-2 rounded-lg border border-slate-300 text-[9px] font-mono text-slate-600">
                            {docName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tactical Actions Dashboard */}
                <div className="space-y-3">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Acciones Administrativas de Moderador</span>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, "aprobado")}
                      disabled={moderatingId === selectedReport.id}
                      className="p-2.5 rounded-xl border bg-emerald-500/10 text-emerald-700 border-emerald-300/60 hover:bg-emerald-500/20 font-mono text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-emerald-500" />
                      Aprobar & Publicar
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, "denunciado_fiscalia")}
                      disabled={moderatingId === selectedReport.id}
                      className="p-2.5 rounded-xl border bg-red-500/10 text-red-700 border-red-300/60 hover:bg-red-500/20 font-mono text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <AlertOctagon className="w-4 h-4 text-red-600" />
                      Enviar Fiscalía
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, "archivado")}
                      disabled={moderatingId === selectedReport.id}
                      className="p-2.5 rounded-xl border bg-sky-500/10 text-sky-700 border-sky-300/60 hover:bg-sky-500/20 font-mono text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-sky-600" />
                      Archivar Dossier
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, "rechazado")}
                      disabled={moderatingId === selectedReport.id}
                      className="p-2.5 rounded-xl border bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300/50 font-mono text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                      Rechazar
                    </button>
                  </div>
                </div>

                {/* Split tool choice switcher */}
                <div className="flex border-b border-slate-200 mt-2">
                  <button
                    onClick={() => setSelectedAiTool("patrones")}
                    className={`pb-2 px-4 font-mono text-[9px] uppercase font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedAiTool === "patrones"
                        ? "border-purple-500 text-purple-600 font-extrabold"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Detector de Patrones (IA)
                  </button>
                  <button
                    onClick={() => setSelectedAiTool("senorita_ia")}
                    className={`pb-2 px-4 font-mono text-[9px] uppercase font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedAiTool === "senorita_ia"
                        ? "border-purple-500 text-purple-600 font-extrabold"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    Asistente Señorita IA ⚖️
                  </button>
                </div>

                {selectedAiTool === "patrones" ? (
                  /* AI Pattern Analysis Section */
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-950 shadow-2xl relative">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[9px] font-mono text-slate-400 tracking-widest flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        MÓDULO DE PATRONES IA RTC
                      </span>
                      <button
                        onClick={handleAnalyzePatterns}
                        disabled={analyzingPatterns}
                        className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-mono text-[9px] font-bold uppercase py-1.5 px-3 rounded border border-purple-400/40 cursor-pointer"
                      >
                        {analyzingPatterns ? "Analizando..." : "Detectar Patrones de Fraude"}
                      </button>
                    </div>

                    {patternResult ? (
                      <div className="space-y-2.5 mt-3 font-sans text-xs">
                        <div className="flex justify-between items-center bg-slate-800 p-2 rounded-lg border border-slate-700/50">
                          <span className="font-mono text-[9px] text-slate-400 uppercase">Gravedad Detectada</span>
                          <span className={`font-mono text-[10px] font-bold py-0.5 px-2 rounded uppercase ${
                            patternResult.severity === "Alta"
                              ? "bg-red-500/10 text-red-400 border border-red-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          }`}>
                            {patternResult.severity}
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-800 rounded-lg border border-slate-700/30 text-[11px] text-slate-200 leading-relaxed italic">
                          "{patternResult.analysisSummary}"
                        </div>

                        <div>
                          <span className="text-[9px] font-mono text-slate-400 uppercase block mb-1">Recomendaciones:</span>
                          <ul className="space-y-1 text-[10px] text-slate-300 leading-snug">
                            {patternResult.recommendations.map((rec, i) => (
                              <li key={i} className="flex gap-1.5 items-start">
                                <span className="text-purple-400 shrink-0 mt-0.5">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 leading-relaxed font-sans mt-2">
                        Haga clic en 'Detectar Patrones de Fraude' para ejecutar un análisis avanzado de IA en tiempo real sobre todos los incidentes recientes de la entidad {selectedReport.targetName}. Buscará campañas coordinadas de difamación o patrones de fraude recurrente.
                      </p>
                    )}
                  </div>
                ) : (
                  /* Señorita IA Compliance Section & Chat */
                  <div className="bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-950 shadow-2xl relative flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-purple-300 tracking-widest flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-purple-400" />
                        SEÑORITA IA - DICTAMEN LEGAL CHILENO
                      </span>
                      <button
                        onClick={handleAnalyzeLegal}
                        disabled={analyzingLegal}
                        className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-mono text-[9px] font-bold uppercase py-1.5 px-3 rounded border border-purple-400/40 cursor-pointer"
                      >
                        {analyzingLegal ? "Analizando Leyes..." : "Ejecutar Dictamen Legal"}
                      </button>
                    </div>

                    {legalResult ? (
                      <div className="space-y-3.5 font-sans text-xs">
                        {/* Summary Verdict & Suggested Action */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700/50">
                            <span className="text-[8px] font-mono text-slate-400 uppercase block mb-0.5">Veredicto Legal</span>
                            <span className={`text-[10px] font-mono font-bold uppercase ${
                              legalResult.verdict === "APROBADO"
                                ? "text-emerald-400"
                                : legalResult.verdict === "REVISIÓN REQUERIDA"
                                ? "text-amber-400"
                                : "text-red-400"
                            }`}>{legalResult.verdict}</span>
                          </div>
                          <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700/50">
                            <span className="text-[8px] font-mono text-slate-400 uppercase block mb-0.5">Sugerencia Operativa</span>
                            <span className="text-[9.5px] font-bold text-slate-200">{legalResult.suggestedAction}</span>
                          </div>
                        </div>

                        {/* Chilean Laws detail boxes */}
                        <div className="space-y-2">
                          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/30">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-mono text-[9px] text-purple-300 font-extrabold">Ley N° 19.628 (Datos Personales)</span>
                              <span className={`text-[8px] font-mono py-0.5 px-1.5 rounded uppercase font-bold border ${
                                legalResult.chileanLawCompliance?.ley19628?.status === "CUMPLE"
                                  ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                                  : "text-amber-400 border-amber-500/20 bg-amber-500/5"
                              }`}>{legalResult.chileanLawCompliance?.ley19628?.status}</span>
                            </div>
                            <p className="text-[10px] text-slate-300 leading-normal">{legalResult.chileanLawCompliance?.ley19628?.details}</p>
                          </div>

                          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/30">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-mono text-[9px] text-purple-300 font-extrabold">Ley N° 19.733 (Ley de Prensa / Opinión)</span>
                              <span className={`text-[8px] font-mono py-0.5 px-1.5 rounded uppercase font-bold border ${
                                legalResult.chileanLawCompliance?.ley19733?.status === "CUMPLE"
                                  ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                                  : "text-amber-400 border-amber-500/20 bg-amber-500/5"
                              }`}>{legalResult.chileanLawCompliance?.ley19733?.status}</span>
                            </div>
                            <p className="text-[10px] text-slate-300 leading-normal">{legalResult.chileanLawCompliance?.ley19733?.details}</p>
                          </div>
                        </div>

                        {/* Dictamen summary block */}
                        <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-850 text-[10px] text-slate-300 leading-relaxed italic">
                          "{legalResult.aiAssistanceSummary}"
                        </div>

                        {/* Interactive Law Chatbox */}
                        <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                          <span className="text-[9px] font-mono text-purple-300 uppercase tracking-widest flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                            CONSULTAR JURÍDICAMENTE A SEÑORITA IA (CHAT)
                          </span>

                          <div className="h-44 overflow-y-auto bg-slate-950/75 rounded-2xl p-3 border border-slate-850 space-y-3">
                            {chatHistory.map((chat, idx) => (
                              <div key={idx} className={`flex flex-col ${chat.role === "user" ? "items-end" : "items-start"}`}>
                                <div className={`max-w-[90%] p-2.5 rounded-2xl text-[10.5px] leading-relaxed shadow-sm ${
                                  chat.role === "user"
                                    ? "bg-purple-600 text-white rounded-tr-none"
                                    : "bg-slate-850 text-slate-200 rounded-tl-none border border-slate-800"
                                }`}>
                                  <span className="block font-mono text-[7px] text-purple-300 uppercase font-bold mb-0.5">
                                    {chat.role === "user" ? "Administrador" : "Señorita IA ⚖️"}
                                  </span>
                                  <p className="whitespace-pre-wrap">{chat.text}</p>
                                </div>
                              </div>
                            ))}
                            {sendingChat && (
                              <div className="flex items-center gap-1.5 text-[8.5px] font-mono text-purple-400 animate-pulse pl-1">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>La Señorita IA está analizando doctrina legal...</span>
                              </div>
                            )}
                          </div>

                          <form onSubmit={handleSendChatMessage} className="flex gap-1.5">
                            <input
                              type="text"
                              value={chatMessage}
                              onChange={(e) => setChatMessage(e.target.value)}
                              placeholder="Pregúntame sobre pruebas falsas, rostros, privacidad o la Ley 19.628..."
                              className="flex-1 bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-[10.5px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-slate-600 font-sans"
                            />
                            <button
                              type="submit"
                              disabled={sendingChat || !chatMessage.trim()}
                              className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-850 text-white px-3 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        </div>

                      </div>
                    ) : (
                      <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans mt-2">
                        Presione 'Ejecutar Dictamen Legal' para que Señorita IA examine el relato e identifique si se exponen rostros o datos privados (infracción a la Ley N° 19.628) o si se imputan delitos infundadamente (calumnias Ley N° 19.733).
                      </p>
                    )}
                  </div>
                )}

              </div>
            ) : (
              <div className="h-[300px] rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center p-6 text-slate-400 bg-slate-50/50">
                <ShieldCheck className="w-12 h-12 mb-3 text-slate-300" />
                <h4 className="text-sm font-sans font-extrabold text-slate-500 uppercase">Sin Denuncia Seleccionada</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm font-mono">
                  Seleccione un expediente de la lista de la izquierda para comenzar la validación técnica o ejecutar análisis avanzado de patrones coordinados.
                </p>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Tab: Payments Configuration Form */
        <div className="w-full bg-slate-100 rounded-2xl p-5 border border-slate-200 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-200">
            <DollarSign className="w-5 h-5 text-purple-600 animate-pulse" />
            <div>
              <h3 className="text-sm font-sans font-extrabold text-slate-800 uppercase tracking-tight">Pasarelas de Pago Autorizadas</h3>
              <p className="text-[10px] text-slate-500 font-mono">SISTEMAS DE COBRO CIUDADANO CONECTADOS A FIRESTORE</p>
            </div>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs rounded-xl font-mono flex items-center gap-2 mb-4 animate-fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 animate-bounce" />
              <span>CONFIGURACIÓN DE PAGOS SINCRONIZADA SATISFACTORIAMENTE EN FIREBASE CLOUD DB.</span>
            </div>
          )}

          <form onSubmit={handleSavePaymentConfig} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Box Flow Chile */}
              <div className="bg-slate-200/60 rounded-2xl p-4 border border-slate-300/85 space-y-3.5 relative flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono text-[10px] font-extrabold text-slate-700 uppercase">Flow Chile API</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={flowActive}
                        onChange={(e) => setFlowActive(e.target.checked)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="font-mono text-[9px] uppercase font-bold text-slate-500">Activa</span>
                    </label>
                  </div>
                  
                  <div className="flex flex-col gap-1 mb-3">
                    <label className="text-[9px] font-mono uppercase text-slate-500 font-bold">Código de Comercio (ID)</label>
                    <input
                      type="text"
                      value={flowComercio}
                      onChange={(e) => setFlowComercio(e.target.value)}
                      placeholder="Ej. 95284"
                      disabled={!flowActive}
                      className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner disabled:opacity-50"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono uppercase text-slate-500 font-bold">Llave Secreta HMAC MD5</label>
                    <input
                      type="password"
                      value={flowSecret}
                      onChange={(e) => setFlowSecret(e.target.value)}
                      placeholder="Signature Secret Key"
                      disabled={!flowActive}
                      className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner font-mono disabled:opacity-50"
                    />
                  </div>

                  {/* Flow Direct Payment Links */}
                  <div className="mt-4 pt-3 border-t border-slate-300/60 space-y-2">
                    <span className="text-[9px] font-mono uppercase text-slate-500 font-bold block">Enlaces de Pago (Botones Flow.cl)</span>
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-mono text-slate-400 uppercase">Enlace Plan Ciudadano</label>
                      <input
                        type="url"
                        value={flowLinkCiudadano}
                        onChange={(e) => setFlowLinkCiudadano(e.target.value)}
                        placeholder="https://www.flow.cl/btn.php?token=..."
                        disabled={!flowActive}
                        className="bg-slate-50 border border-slate-300 rounded-lg p-2 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono disabled:opacity-50"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-mono text-slate-400 uppercase">Enlace Plan Periodista</label>
                      <input
                        type="url"
                        value={flowLinkPeriodista}
                        onChange={(e) => setFlowLinkPeriodista(e.target.value)}
                        placeholder="https://www.flow.cl/btn.php?token=..."
                        disabled={!flowActive}
                        className="bg-slate-50 border border-slate-300 rounded-lg p-2 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono disabled:opacity-50"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-mono text-slate-400 uppercase">Enlace Plan Empresa</label>
                      <input
                        type="url"
                        value={flowLinkEmpresa}
                        onChange={(e) => setFlowLinkEmpresa(e.target.value)}
                        placeholder="https://www.flow.cl/btn.php?token=..."
                        disabled={!flowActive}
                        className="bg-slate-50 border border-slate-300 rounded-lg p-2 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono disabled:opacity-50"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-mono text-slate-400 uppercase">Enlace Plan Municipio</label>
                      <input
                        type="url"
                        value={flowLinkMunicipio}
                        onChange={(e) => setFlowLinkMunicipio(e.target.value)}
                        placeholder="https://www.flow.cl/btn.php?token=..."
                        disabled={!flowActive}
                        className="bg-slate-50 border border-slate-300 rounded-lg p-2 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[8.5px] text-slate-500 leading-normal font-mono mt-3 border-t border-slate-300/60 pt-2">
                  ℹ️ Integra tarjetas WebPay de chilenos mediante REST API.
                </p>
              </div>

              {/* Box Stripe */}
              <div className="bg-slate-200/60 rounded-2xl p-4 border border-slate-300/85 space-y-3.5 relative flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono text-[10px] font-extrabold text-slate-700 uppercase">Stripe Global</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stripeActive}
                        onChange={(e) => setStripeActive(e.target.checked)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="font-mono text-[9px] uppercase font-bold text-slate-500">Activa</span>
                    </label>
                  </div>
                  
                  <div className="flex flex-col gap-1 mb-3">
                    <label className="text-[9px] font-mono uppercase text-slate-500 font-bold">Clave Pública (Publishable Key)</label>
                    <input
                      type="text"
                      value={stripePublic}
                      onChange={(e) => setStripePublic(e.target.value)}
                      placeholder="pk_test_..."
                      disabled={!stripeActive}
                      className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner disabled:opacity-50"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono uppercase text-slate-500 font-bold">Clave Privada (Secret Key)</label>
                    <input
                      type="password"
                      value={stripeSecret}
                      onChange={(e) => setStripeSecret(e.target.value)}
                      placeholder="sk_test_..."
                      disabled={!stripeActive}
                      className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner font-mono disabled:opacity-50"
                    />
                  </div>
                </div>
                <p className="text-[8.5px] text-slate-500 leading-normal font-mono mt-3 border-t border-slate-300/60 pt-2">
                  ℹ️ Permite transacciones en dólares USD de alta seguridad.
                </p>
              </div>

              {/* Box Mercado Pago */}
              <div className="bg-slate-200/60 rounded-2xl p-4 border border-slate-300/85 space-y-3.5 relative flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono text-[10px] font-extrabold text-slate-700 uppercase">Mercado Pago</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mpActive}
                        onChange={(e) => setMpActive(e.target.checked)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="font-mono text-[9px] uppercase font-bold text-slate-500">Activa</span>
                    </label>
                  </div>
                  
                  <div className="flex flex-col gap-1 mb-3">
                    <label className="text-[9px] font-mono uppercase text-slate-500 font-bold">Public Key (MercadoLibre)</label>
                    <input
                      type="text"
                      value={mpPublic}
                      onChange={(e) => setMpPublic(e.target.value)}
                      placeholder="APP_USR-..."
                      disabled={!mpActive}
                      className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner disabled:opacity-50"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-mono uppercase text-slate-500 font-bold">Access Token</label>
                    <input
                      type="password"
                      value={mpSecret}
                      onChange={(e) => setMpSecret(e.target.value)}
                      placeholder="TEST-..."
                      disabled={!mpActive}
                      className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner font-mono disabled:opacity-50"
                    />
                  </div>
                </div>
                <p className="text-[8.5px] text-slate-500 leading-normal font-mono mt-3 border-t border-slate-300/60 pt-2">
                  ℹ️ Procesa pagos instantáneos con QR o monederos locales.
                </p>
              </div>

            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={savingConfig}
                className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-mono text-xs font-bold uppercase py-3.5 px-8 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {savingConfig ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sincronizando con Firebase...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-purple-400" />
                    Sincronizar Credenciales en la Nube
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
