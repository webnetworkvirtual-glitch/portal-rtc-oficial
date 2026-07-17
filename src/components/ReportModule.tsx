import React, { useState } from "react";
import { collection, addDoc, doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { REPORT_CATEGORIES, CHILEAN_REGIONS } from "../mockData";
import { Send, Sparkles, Check, AlertTriangle, ShieldCheck, HelpCircle, FileCheck, UploadCloud, RefreshCw, X } from "lucide-react";

interface ReportModuleProps {
  currentUser: { email: string; isPremium: boolean; plan: string } | null;
  onSuccess: () => void;
}

export const ReportModule: React.FC<ReportModuleProps> = ({ currentUser, onSuccess }) => {
  // Form State
  const [targetName, setTargetName] = useState("");
  const [targetRut, setTargetRut] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(REPORT_CATEGORIES[0]);
  const [selectedRegion, setSelectedRegion] = useState(CHILEAN_REGIONS[0].name);
  const [selectedComuna, setSelectedComuna] = useState(CHILEAN_REGIONS[0].comunas[0]);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState(currentUser?.email || "");

  // Documents
  const [documents, setDocuments] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // AI Moderation Assistant State
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    isDefamatory: boolean;
    defamationExplanation: string;
    suggestedCleanText: string;
    anonymizedText: string;
    suggestedCategory: string;
    evidenceLevelScore: number;
  } | null>(null);
  const [aiApplied, setAiApplied] = useState(false);

  // General flow state
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Handles updating comuna list based on region
  const regionObj = CHILEAN_REGIONS.find(r => r.name === selectedRegion);
  const comunas = regionObj ? regionObj.comunas : [];

  // Drag and drop documents
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newDocs = Array.from(e.dataTransfer.files).map((file: any) => file.name);
      setDocuments(prev => [...prev, ...newDocs]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newDocs = Array.from(e.target.files).map((file: any) => file.name);
      setDocuments(prev => [...prev, ...newDocs]);
    }
  };

  const removeDoc = (idx: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== idx));
  };

  // Run AI Moderation Analysis (Full-stack API call!)
  const handleAiModerationCheck = async () => {
    if (!description.trim() || !targetName.trim()) {
      alert("Por favor ingrese el nombre del destinatario y la descripción para ejecutar el análisis de IA.");
      return;
    }

    setAiAnalyzing(true);
    setAiAnalysisResult(null);
    setAiApplied(false);

    try {
      const response = await fetch("/api/check-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          targetName
        })
      });

      const data = await response.json();
      if (response.ok) {
        setAiAnalysisResult(data);
        if (data.suggestedCategory && REPORT_CATEGORIES.includes(data.suggestedCategory)) {
          setCategory(data.suggestedCategory);
        }
      } else {
        throw new Error(data.error || "API error");
      }
    } catch (err) {
      console.error(err);
      // Fallback in case of server/quota issues
      setAiAnalysisResult({
        isDefamatory: false,
        defamationExplanation: "Sugerencia offline: Recuerde redactar en tercera persona indicando solo hechos demostrables con fechas y respaldos.",
        suggestedCleanText: description,
        anonymizedText: description.replace(/\d{8}-\d/g, "[RUT OCULTO]"),
        suggestedCategory: category,
        evidenceLevelScore: 3
      });
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Apply AI suggestions
  const applyAiSuggestions = () => {
    if (!aiAnalysisResult) return;
    setDescription(aiAnalysisResult.anonymizedText);
    setAiApplied(true);
  };

  // Submit report to Firestore
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetName || !description || !userEmail) {
      alert("Por favor rellene todos los campos obligatorios.");
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Check if entity exists in Firestore, or create it!
      const entityId = targetName.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with hyphen
        .replace(/(^-|-$)/g, ""); // clean edge hyphens

      const entityRef = doc(db, "entities", entityId);
      const entitySnap = await getDoc(entityRef);

      if (entitySnap.exists()) {
        // Entity exists, increment counters
        const currentData = entitySnap.data();
        await updateDoc(entityRef, {
          totalReports: (currentData.totalReports || 0) + 1,
          evidenceLevel: ((currentData.evidenceLevel || 3) * (currentData.totalReports || 1) + (aiAnalysisResult?.evidenceLevelScore || 3)) / ((currentData.totalReports || 0) + 1)
        });
      } else {
        // Create new Entity in database
        await setDoc(entityRef, {
          id: entityId,
          name: targetName,
          rut: targetRut || "Pendiente",
          type: "empresa", // default to empresa, editable by moderators
          category,
          comuna: selectedComuna,
          region: selectedRegion,
          totalReports: 1,
          resolvedReports: 0,
          avgResponseTime: 7,
          evidenceLevel: aiAnalysisResult?.evidenceLevelScore || 3,
          isVerified: false,
          createdAt: new Date().toISOString()
        });
      }

      // Step 2: Save the Report
      const reportsCol = collection(db, "reports");
      const reportId = `rep-${Math.floor(100000 + Math.random() * 900000)}`;
      await setDoc(doc(db, "reports", reportId), {
        id: reportId,
        entityId,
        targetName,
        title: title || `Denuncia contra ${targetName}`,
        description,
        category,
        evidenceLevelScore: aiAnalysisResult?.evidenceLevelScore || 3,
        evidenceDocuments: documents,
        status: "pendiente", // moderador debe aprobarla
        userId: currentUser?.email || "anonimo",
        userName: userName || "Ciudadano Anónimo",
        userEmail,
        createdAt: new Date().toISOString(),
        isAnonymized: aiApplied,
        isModerated: false,
        aiDefamationExplanation: aiAnalysisResult?.defamationExplanation || ""
      });

      setShowSuccessModal(true);
    } catch (err) {
      console.error("Error creating report:", err);
      alert("Ocurrió un error al enviar el reporte. Por favor intente de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    // Reset Form
    setTargetName("");
    setTargetRut("");
    setTitle("");
    setDescription("");
    setDocuments([]);
    setAiAnalysisResult(null);
    setAiApplied(false);
    onSuccess();
  };

  return (
    <div className="w-full bg-slate-100 rounded-3xl p-6 border border-slate-200/90 shadow-[8px_8px_16px_#cbd0da,-8px_-8px_16px_#ffffff] relative overflow-hidden">
      {/* Schematic overlay lines */}
      <div className="absolute top-0 right-12 w-24 h-[1px] bg-gradient-to-r from-transparent via-orange-500/30 to-transparent"></div>

      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200/80">
        <div className="p-2.5 rounded-xl bg-slate-900 text-orange-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
          <Send className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-sans font-extrabold text-slate-800 uppercase tracking-tight">Formulario de Reporte Ciudadano</h2>
          <p className="text-xs text-slate-500 font-mono">ASISTIDO POR IA DE MODERACIÓN Y VALIDACIÓN TÉCNICA DE CHILE</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Form details */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Target Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">Empresa u Organismo Público *</label>
              <input
                type="text"
                required
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder="Ej. Constructora ABC"
                className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-700 shadow-inner focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">RUT de Empresa (Opcional)</label>
              <input
                type="text"
                value={targetRut}
                onChange={(e) => setTargetRut(e.target.value)}
                placeholder="Ej. 76.452.981-K"
                className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-700 shadow-inner focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Location Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">Categoría de Incidente</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-700 shadow-inner focus:outline-none"
              >
                {REPORT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">Región</label>
              <select
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  const reg = CHILEAN_REGIONS.find(r => r.name === e.target.value);
                  if (reg && reg.comunas.length > 0) setSelectedComuna(reg.comunas[0]);
                }}
                className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-700 shadow-inner focus:outline-none"
              >
                {CHILEAN_REGIONS.map(reg => (
                  <option key={reg.name} value={reg.name}>{reg.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">Comuna</label>
              <select
                value={selectedComuna}
                onChange={(e) => setSelectedComuna(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-700 shadow-inner focus:outline-none"
              >
                {comunas.map(com => (
                  <option key={com} value={com}>{com}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Incident Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">Título de Denuncia *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Cobros indebidos en cuotas de mantención de edificio"
              className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-700 shadow-inner focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Description of Incident */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">Relato Detallado de los Hechos *</label>
              <span className="text-[9px] text-amber-600 font-mono uppercase">Min. 50 caracteres</span>
            </div>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describa de forma objetiva, con fechas, horas, montos e información fáctica demostrable lo sucedido. Evite adjetivos de culpabilidad y lenguaje descalificatorio."
              className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-700 shadow-inner focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
            />
          </div>

          {/* User Profile info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">Su Nombre y Apellidos (Para moderación)</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Ej. Juan Pérez González"
                className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-700 shadow-inner focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">Su Correo de Contacto *</label>
              <input
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="Ej. juan.perez@email.cl"
                className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-700 shadow-inner focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Drag & Drop Documents Upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">Evidencias y Documentos de Respaldo (PDF, Img)</label>
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-orange-500 bg-orange-50/50"
                  : "border-slate-300 bg-slate-50 hover:bg-slate-100/80"
              }`}
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-700">Arrastre y suelte sus archivos aquí, o haga clic para buscar</p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Sube facturas, contratos, correos, boletas oficiales</p>
              <input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Uploaded Documents List */}
            {documents.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-slate-200/50 rounded-xl border border-slate-200">
                {documents.map((docName, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-slate-100 py-1 px-2.5 rounded-lg border border-slate-300 text-[10px] font-mono text-slate-700">
                    <span className="truncate max-w-[150px]">{docName}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDoc(idx);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right column: AI assistant interface */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 border border-slate-950 shadow-2xl relative overflow-hidden flex flex-col justify-between h-full min-h-[420px]">
            {/* Absolute background radar graphic element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full filter blur-xl"></div>
            
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-mono text-slate-400 tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                  RED TRANSPARENCIA IA v2.5
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]"></div>
                  <span className="text-[9px] font-mono text-orange-400 uppercase">En línea</span>
                </div>
              </div>

              <h3 className="text-sm font-sans font-extrabold text-white tracking-tight uppercase mb-2">
                Asistente de Moderación Preventiva
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-sans mb-4">
                Analice su texto antes de publicarlo. Nuestra IA detectará posibles afirmaciones difamatorias (riesgos legales en Chile), censurará automáticamente datos personales privados y evaluará el nivel de evidencia.
              </p>

              {/* Action Button: AI Check */}
              <button
                type="button"
                onClick={handleAiModerationCheck}
                disabled={aiAnalyzing}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-800 text-white font-mono text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl shadow-[0_4px_12px_rgba(249,115,22,0.3)] hover:shadow-[0_4px_16px_rgba(249,115,22,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {aiAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sincronizando con Servidor IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Ejecutar Análisis de IA
                  </>
                )}
              </button>

              {/* AI Analysis Output */}
              {aiAnalysisResult && (
                <div className="mt-5 space-y-4 font-sans text-xs">
                  {/* Warning Box */}
                  <div className={`p-3.5 rounded-xl border flex gap-2.5 ${
                    aiAnalysisResult.isDefamatory
                      ? "bg-amber-950/40 border-amber-500/30 text-amber-300"
                      : "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                  }`}>
                    {aiAnalysisResult.isDefamatory ? (
                      <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" />
                    )}
                    <div>
                      <h4 className="font-bold uppercase tracking-tight text-[11px] mb-1">
                        {aiAnalysisResult.isDefamatory ? "Alerta de Redacción" : "Cumplimiento de Redacción Ok"}
                      </h4>
                      <p className="text-[10px] leading-relaxed opacity-90">{aiAnalysisResult.defamationExplanation}</p>
                    </div>
                  </div>

                  {/* Anonymized Suggestion Panel */}
                  <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/50">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[9px] font-mono text-slate-400 uppercase">Texto sugerido por la IA:</span>
                      <span className="text-[9px] bg-slate-900 text-orange-400 font-mono py-0.5 px-1.5 rounded uppercase font-bold">
                        Diferido
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-200 italic line-clamp-4">
                      "{aiAnalysisResult.anonymizedText}"
                    </p>
                  </div>

                  {/* Evidence indicator */}
                  <div className="flex items-center justify-between bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/30">
                    <span className="text-[9px] font-mono text-slate-400 uppercase">Score de Evidencia Estimada</span>
                    <div className="flex items-center gap-1 font-mono font-bold text-orange-400">
                      <span>{aiAnalysisResult.evidenceLevelScore} / 5</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Check key={i} className={`w-3 h-3 ${i < aiAnalysisResult.evidenceLevelScore ? "text-orange-500" : "text-slate-600"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Apply AI Correction Toggle Button */}
            {aiAnalysisResult && (
              <button
                type="button"
                onClick={applyAiSuggestions}
                disabled={aiApplied}
                className={`w-full mt-4 font-mono text-[11px] font-bold uppercase tracking-wide py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  aiApplied
                    ? "bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed"
                    : "bg-slate-200 hover:bg-white text-slate-900 shadow-md active:scale-[0.98]"
                }`}
              >
                {aiApplied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    Sugerencias Aplicadas con Éxito
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4 text-orange-500" />
                    Aplicar Texto Anodino & Anonymizado
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Submit Form Button Footer */}
        <div className="lg:col-span-12 flex justify-end gap-3 pt-4 border-t border-slate-200 mt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-mono text-xs font-bold uppercase tracking-wider py-3.5 px-8 rounded-2xl shadow-[4px_4px_10px_rgba(0,0,0,0.25)] hover:shadow-[4px_4px_16px_rgba(0,0,0,0.35)] active:scale-[0.98] transition-all flex items-center gap-2.5"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                Guardando en Servidor Firebase...
              </>
            ) : (
              <>
                <Send className="w-4.5 h-4.5" />
                Enviar Reporte a Moderación
              </>
            )}
          </button>
        </div>
      </form>

      {/* Success Modal Dialogue */}
      {showSuccessModal && (
        <div 
          onClick={handleModalClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-100 rounded-3xl p-6 border border-slate-300 max-w-md w-full shadow-2xl relative cursor-default"
          >
            {/* Absolute close button ("X") */}
            <button
              type="button"
              onClick={handleModalClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1.5 rounded-full transition-all flex items-center justify-center"
              aria-label="Cerrar"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center text-emerald-500 mb-4 animate-bounce">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-base font-sans font-extrabold text-slate-800 uppercase tracking-tight">¡Reporte Enviado Exitosamente!</h3>
              <p className="text-xs text-slate-500 font-mono mt-1">ESTADO: PENDIENTE DE MODERACIÓN DE LA RTC CHILE</p>
              
              <div className="bg-slate-200/50 rounded-2xl p-4 border border-slate-200 shadow-inner my-4 text-xs text-left text-slate-600 leading-relaxed font-sans">
                Su reporte se guardó de forma real en la base de datos Firestore. Para mantener el estándar de transparencia ciudadana chilena, la denuncia pasará por el flujo:
                <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-orange-600 mt-2 uppercase">
                  <span>Usuario</span> → <span>IA RTC</span> → <span>Moderador</span> → <span>Publicación</span>
                </div>
              </div>

              <button
                onClick={handleModalClose}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase py-3 rounded-xl shadow-md"
              >
                Entendido, Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
