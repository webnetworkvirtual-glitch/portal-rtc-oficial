import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Entity, Report } from "../types";
import { Search, MapPin, Building2, Link2, Phone, Mail, FileCheck, Star, Sparkles, RefreshCw, AlertTriangle, ArrowRight, ShieldCheck, ChevronRight } from "lucide-react";

interface SearchModuleProps {
  onSelectEntity: (entity: Entity) => void;
}

export const SearchModule: React.FC<SearchModuleProps> = ({ onSelectEntity }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFilter, setSearchFilter] = useState<"todos" | "empresa" | "organismo" | "persona">("todos");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [filteredEntities, setFilteredEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Advanced attributes selected by tactile toggles
  const [searchAttributes, setSearchAttributes] = useState({
    rut: true,
    domain: true,
    phone: true,
    email: true,
    patente: true,
    comuna: true
  });

  // Fetch all entities from Firestore on mount
  useEffect(() => {
    setIsLoading(true);
    const q = collection(db, "entities");
    
    // Set up a real-time listener for direct live updates!
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Entity[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Entity);
      });
      setEntities(list);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore loading error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter entities locally based on parameters
  useEffect(() => {
    let result = entities;

    if (searchFilter !== "todos") {
      result = result.filter(e => e.type === searchFilter);
    }

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(e => {
        const matchName = e.name.toLowerCase().includes(term);
        const matchRut = searchAttributes.rut && e.rut?.toLowerCase().includes(term);
        const matchDomain = searchAttributes.domain && e.domain?.toLowerCase().includes(term);
        const matchPhone = searchAttributes.phone && e.phone?.toLowerCase().includes(term);
        const matchEmail = searchAttributes.email && e.email?.toLowerCase().includes(term);
        const matchCategory = e.category.toLowerCase().includes(term);
        const matchComuna = searchAttributes.comuna && e.comuna.toLowerCase().includes(term);
        
        return matchName || matchRut || matchDomain || matchPhone || matchEmail || matchCategory || matchComuna;
      });
    }

    setFilteredEntities(result);
  }, [searchTerm, searchFilter, entities, searchAttributes]);

  const toggleAttribute = (key: keyof typeof searchAttributes) => {
    setSearchAttributes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Control Column: Search panel & toggles */}
      <div className="lg:col-span-4 bg-slate-100 rounded-3xl p-5 border border-slate-200/90 shadow-[6px_6px_12px_#cbd0da,-6px_-6px_12px_#ffffff] relative">
        <div className="absolute top-2 left-2 w-1 h-1 rounded-full bg-slate-400"></div>
        <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-slate-400"></div>

        <h3 className="text-xs font-mono font-bold uppercase text-slate-500 tracking-wider mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
          <Search className="w-4.5 h-4.5 text-orange-500" />
          Filtros y Parámetros
        </h3>

        {/* Tactile Mode Selectors */}
        <div className="flex flex-col gap-2 mb-5">
          <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">Tipo de Entidad</label>
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-200/60 rounded-xl shadow-inner">
            {(["todos", "empresa", "organismo", "persona"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSearchFilter(mode)}
                className={`text-[10px] font-mono py-1.5 px-1 rounded-lg uppercase tracking-tight font-bold transition-all ${
                  searchFilter === mode
                    ? "bg-slate-100 text-orange-600 shadow-[2px_2px_4px_#cbd5e1,-2px_-2px_4px_#ffffff]"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {mode === "todos" ? "Todos" : mode === "organismo" ? "Muni/Org" : mode}
              </button>
            ))}
          </div>
        </div>

        {/* Attributes Checklist Switches (Tactile checkboxes as in visual guidelines) */}
        <div className="flex flex-col gap-2.5 mb-5">
          <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">Atributos de Búsqueda Activos</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(searchAttributes).map((key) => {
              const active = searchAttributes[key as keyof typeof searchAttributes];
              return (
                <button
                  key={key}
                  onClick={() => toggleAttribute(key as keyof typeof searchAttributes)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                    active
                      ? "bg-slate-200/80 border-slate-300 text-slate-800 shadow-inner"
                      : "bg-slate-100 border-slate-200 text-slate-400"
                  }`}
                >
                  {/* Neumorphic Indicator Dot */}
                  <div className={`w-3 h-3 rounded-full flex items-center justify-center shadow-inner border border-slate-300/60 ${active ? "bg-orange-500 shadow-[0_0_6px_#f97316]" : "bg-slate-200"}`}>
                    {active && <div className="w-1 h-1 rounded-full bg-white"></div>}
                  </div>
                  <span className="text-[10px] font-mono uppercase font-semibold">{key}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Statistics Board */}
        <div className="bg-slate-800/95 rounded-2xl p-4 text-slate-200 border border-slate-900 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Base de Datos</span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-mono text-emerald-400 uppercase">Verificado</span>
            </div>
          </div>
          <div className="font-mono text-lg font-bold text-orange-500 tracking-wider">
            {entities.length} REGISTROS TOTALES
          </div>
          <div className="mt-2 text-[10px] text-slate-400 leading-relaxed font-sans">
            La Red de Transparencia de Chile sincroniza datos públicos de la CMF, Mercado Público y denuncias revisadas bajo protocolo anti-difamación.
          </div>
        </div>
      </div>

      {/* Right Content Column: Search Input and Dossier Cards */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {/* Sleek tactile search box */}
        <div className="bg-slate-100 rounded-3xl p-4 border border-slate-200/90 shadow-[6px_6px_12px_#cbd0da,-6px_-6px_12px_#ffffff] flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-200 text-slate-500 shadow-inner border border-slate-300/40">
            <Search className="w-5 h-5 text-orange-500" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Empresa, Municipalidad, RUT, Teléfono, Patente, Dominio web, Correo o Comuna..."
            className="flex-1 bg-transparent text-sm font-sans text-slate-700 placeholder-slate-400 border-none outline-none focus:ring-0 focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-xs font-mono text-slate-400 hover:text-slate-600 bg-slate-200/80 hover:bg-slate-200 py-1 px-2.5 rounded-lg border border-slate-300 shadow-sm active:shadow-inner"
            >
              LIMPIAR
            </button>
          )}
        </div>

        {/* Results List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-100 rounded-3xl border border-slate-200 shadow-inner">
            <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mb-3" />
            <p className="text-xs font-mono text-slate-500 uppercase">Consultando base de datos nacional...</p>
          </div>
        ) : filteredEntities.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-100 rounded-3xl border border-slate-200 shadow-inner text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
            <h4 className="text-sm font-sans font-bold text-slate-700 uppercase">Sin Registros Encontrados</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1 font-mono">
              Intente buscando con otros parámetros o verifique la ortografía. Si es un incidente nuevo, puede crear un reporte desde la pestaña de Reportar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEntities.map((entity) => {
              const resolutionRate = entity.totalReports > 0
                ? Math.round((entity.resolvedReports / entity.totalReports) * 100)
                : 100;

              return (
                <div
                  key={entity.id}
                  onClick={() => onSelectEntity(entity)}
                  className="bg-slate-100 hover:bg-slate-200/60 rounded-2xl p-4.5 border border-slate-200/90 shadow-[4px_4px_8px_#cfd2d9,-4px_-4px_8px_#ffffff] hover:shadow-[2px_2px_4px_#cfd2d9,-2px_-2px_4px_#ffffff] cursor-pointer transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Decorative stamped file tab */}
                  <div className="absolute top-0 right-0 w-16 h-4 bg-orange-500/10 border-l border-b border-orange-500/30 text-[8px] font-mono text-orange-700 flex items-center justify-center font-bold tracking-wider uppercase rounded-bl-lg">
                    {entity.type}
                  </div>

                  <div>
                    {/* Entity basic details */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-slate-200/80 border border-slate-300/40 text-slate-500 shadow-inner">
                        <Building2 className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-sm font-sans font-extrabold text-slate-800 tracking-tight leading-tight group-hover:text-orange-600 transition-colors">
                          {entity.name}
                        </h4>
                        {entity.rut && (
                          <span className="text-[10px] font-mono text-slate-500">RUT: {entity.rut}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mt-1 mb-3">
                      <span className="text-[10px] font-mono text-slate-500 uppercase">{entity.category}</span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] font-mono text-slate-500 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" /> {entity.comuna}, {entity.region}
                      </span>
                    </div>

                    {/* Quality Ratings */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-200/40 rounded-xl p-2.5 border border-slate-200 shadow-inner mb-3">
                      <div>
                        <span className="text-[9px] font-mono uppercase text-slate-500 block">Reportes</span>
                        <span className="text-sm font-mono font-bold text-slate-700">{entity.totalReports}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono uppercase text-slate-500 block">Tasa de Respuesta</span>
                        <span className={`text-sm font-mono font-bold ${resolutionRate >= 70 ? "text-emerald-500" : "text-amber-500"}`}>
                          {resolutionRate}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-2">
                    {/* Evidence score star ratings */}
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < Math.round(entity.evidenceLevel)
                              ? "text-orange-500 fill-orange-500/80 shadow-orange-500/20"
                              : "text-slate-300"
                          }`}
                        />
                      ))}
                    </div>

                    <span className="text-[10px] font-mono font-bold text-orange-600 uppercase flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Ver Expediente <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
