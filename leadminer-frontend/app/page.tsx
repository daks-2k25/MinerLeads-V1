"use client";

import { useMemo, useState } from "react";
import { Lead } from "@/src/models/lead";
import { SavedSearch } from "@/src/models/savedSearch";
import { SearchHistory } from "@/src/models/searchHistory";
import { useLeads } from "@/hooks/useLeads";
import { useScraperSearch } from "@/hooks/useScraperSearch";
import { useExportLeads } from "@/hooks/useExportLeads";
import { useExportHistoricoLeads } from "@/hooks/useExportHistoricoLeads";
import { useSavedSearches } from "@/hooks/useSavedSearches";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { deriveLeadStats } from "@/lib/leadStats";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBar } from "@/components/search/SearchBar";
import { StatsStrip } from "@/components/dashboard/StatsStrip";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadDetailsPanel } from "@/components/leads/LeadDetailsPanel";
import { SaveSearchModal } from "@/components/saved-searches/SaveSearchModal";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBanner } from "@/components/feedback/StatusBanner";

export default function Home() {
  const { leads, setLeads } = useLeads();
  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null);
  const {
    termoBusca,
    setTermoBusca,
    cidade,
    setCidade,
    bairro,
    setBairro,
    categoria,
    setCategoria,
    loading,
    status,
    progresso,
    handlePesquisar,
  } = useScraperSearch(setLeads);
  const { handleExportar, exportando, erro: erroExportacao } = useExportLeads(leads);
  const {
    handleExportarHistorico,
    exportandoId: exportandoHistoricoId,
    erro: erroExportacaoHistorico,
  } = useExportHistoricoLeads();
  const {
    buscasSalvas,
    loading: buscasSalvasLoading,
    error: buscasSalvasError,
    criarBuscaSalva,
    removerBuscaSalva,
  } = useSavedSearches();
  const {
    historico,
    loading: historicoLoading,
    error: historicoError,
    carregarHistorico,
    removerHistorico,
  } = useSearchHistory();

  const [modalSalvarAberto, setModalSalvarAberto] = useState(false);
  const [salvandoBusca, setSalvandoBusca] = useState(false);

  const stats = useMemo(() => deriveLeadStats(leads), [leads]);

  const handleSelecionarBuscaSalva = (busca: SavedSearch) => {
    setTermoBusca(busca.termoBusca);
    setCidade(busca.cidade);
    setBairro(busca.bairro);
    setCategoria(busca.categoria);
  };

  const handleRepetirHistorico = (item: SearchHistory) => {
    setTermoBusca(item.termoBusca);
    setCidade(item.cidade);
    setBairro(item.bairro);
    setCategoria(item.categoria);
  };

  const handleSalvarBusca = async (nome: string) => {
    setSalvandoBusca(true);
    try {
      await criarBuscaSalva({ nome, termoBusca, cidade, bairro, categoria });
      setModalSalvarAberto(false);
    } catch {
      // erro já é exposto via buscasSalvasError
    } finally {
      setSalvandoBusca(false);
    }
  };

  const handlePesquisarComHistorico = async () => {
    await handlePesquisar();
    carregarHistorico();
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar
        buscasSalvas={buscasSalvas}
        buscasSalvasLoading={buscasSalvasLoading}
        buscasSalvasError={buscasSalvasError}
        onSelectBuscaSalva={handleSelecionarBuscaSalva}
        onRemoverBuscaSalva={removerBuscaSalva}
        historico={historico}
        historicoLoading={historicoLoading}
        historicoError={historicoError}
        onRepetirHistorico={handleRepetirHistorico}
        onRemoverHistorico={removerHistorico}
        onExportarHistorico={handleExportarHistorico}
        exportandoHistoricoId={exportandoHistoricoId}
        erroExportacaoHistorico={erroExportacaoHistorico}
      />
      <main className="flex flex-1 flex-col gap-4 p-5 md:p-6">
        <SearchBar
          termoBusca={termoBusca}
          cidade={cidade}
          bairro={bairro}
          categoria={categoria}
          onTermoBuscaChange={setTermoBusca}
          onCidadeChange={setCidade}
          onBairroChange={setBairro}
          onCategoriaChange={setCategoria}
          onPesquisar={handlePesquisarComHistorico}
          onExportar={handleExportar}
          onSalvarBusca={() => setModalSalvarAberto(true)}
          loading={loading}
          exportando={exportando}
          podeExportar={leads.length > 0}
          podeSalvarBusca={termoBusca.trim().length > 0}
        />

        <StatusBanner status={status} />
        <StatusBanner
          status={erroExportacao ? { message: erroExportacao, tone: "error" } : null}
        />

        <StatsStrip stats={stats} />

        {loading ? (
          <LoadingState progresso={progresso} />
        ) : leads.length === 0 ? (
          <EmptyState />
        ) : (
          <LeadsTable leads={leads} onSelectLead={setLeadSelecionado} />
        )}
      </main>

      <LeadDetailsPanel lead={leadSelecionado} onClose={() => setLeadSelecionado(null)} />

      <SaveSearchModal
        aberto={modalSalvarAberto}
        termoBusca={termoBusca}
        cidade={cidade}
        bairro={bairro}
        categoria={categoria}
        salvando={salvandoBusca}
        erro={buscasSalvasError}
        onClose={() => setModalSalvarAberto(false)}
        onSalvar={handleSalvarBusca}
      />
    </div>
  );
}
