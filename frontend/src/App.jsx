import React, { lazy, Suspense } from "react";
import { BrowserRouter, Switch, Route, Redirect } from 'react-router-dom';
import Layout from './components/Layout';
const Kanban = lazy(() => import('./pages/Kanban'));
const EditorModulo = lazy(() => import('./pages/EditorModulo'));
const BibliotecaModulos = lazy(() => import('./pages/BibliotecaModulos'));
const DetalheProjeto = lazy(() => import('./pages/DetalheProjeto'));
const ProducaoProjeto = lazy(() => import('./pages/ProducaoProjeto'));
const TesteCenario = lazy(() => import('./pages/TesteCenario'));
const Login = lazy(() => import('./pages/Login'));
const ManualMontagem = lazy(() => import('./pages/ManualMontagem'));
const CenaComercial = lazy(() => import('./pages/CenaComercial'));
const ContratoProjeto = lazy(() => import('./pages/ContratoProjeto'));
const Clientes = lazy(() => import('./pages/Clientes'));
const Projetos = lazy(() => import('./pages/Projetos'));
const Insumos = lazy(() => import('./pages/Insumos'));
const EmBreve = lazy(() => import('./pages/EmBreve'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const Painel = lazy(() => import('./pages/Painel'));
const Orcamentos = lazy(() => import('./pages/Orcamentos'));
const OrcamentoProjeto = lazy(() => import('./pages/OrcamentoProjeto'));
const ResumoCustos = lazy(() => import('./pages/ResumoCustos'));

function CarregandoPagina() {
  return <p className="p-4 text-sm text-gray-500">Carregando...</p>;
}

function RotasAutenticadas() {
  return (
    <Switch>
      <Route exact path="/"><Painel /></Route>
      <Route exact path="/kanban"><Kanban /></Route>
      <Route exact path="/clientes"><Clientes /></Route>
      <Route exact path="/projetos"><Projetos /></Route>
      <Route exact path="/projetos/:projetoId" component={DetalheProjeto} />
      <Route exact path="/projetos/:projetoId/producao" component={ProducaoProjeto} />
      <Route exact path="/insumos"><Insumos /></Route>
      <Route exact path="/orcamento"><Orcamentos /></Route>
      <Route exact path="/projetos/:projetoId/orcamento" render={({ match }) => (
        <OrcamentoProjeto projetoId={match.params.projetoId} key={match.params.projetoId} />
      )} />
      <Route exact path="/projetos/:projetoId/orcamento/resumo" render={({ match }) => (
        <ResumoCustos projetoId={match.params.projetoId} key={match.params.projetoId} />
      )} />
      <Route exact path="/configuracoes"><Configuracoes /></Route>
      <Route exact path="/editor"><EditorModulo /></Route>
      <Route
        path="/editor/:projetoId/:moduloId"
        render={({ match }) => (
          <EditorModulo
            projetoId={match.params.projetoId}
            moduloId={match.params.moduloId}
          />
        )}
      />
      <Route
        exact
        path="/editor/:projetoId"
        render={({ match }) => <EditorModulo projetoId={match.params.projetoId} />}
      />
      <Route path="/biblioteca" component={BibliotecaModulos} />
      <Route
        exact
        path="/projetos/:projetoId/contrato"
        render={({ match }) => (
          <ContratoProjeto projetoId={match.params.projetoId} />
        )}
      />
      <Route
        exact
        path="/projetos/:projetoId/cena"
        render={({ match }) => <CenaComercial projetoId={match.params.projetoId} />}
      />
    </Switch>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Switch>
        {/* manual de montagem acessado pelo QR Code: público, sem login */}
        <Route exact path="/manual/:projetoId/:peca">
          <Suspense fallback={<CarregandoPagina />}><ManualMontagem /></Suspense>
        </Route>
        {/* página de teste do cenário: sem login, para screenshots automatizados */}
        <Route exact path="/teste-cenario">
          <Suspense fallback={<CarregandoPagina />}><TesteCenario /></Suspense>
        </Route>
        <Route exact path="/login">
          <Suspense fallback={<CarregandoPagina />}><Login /></Suspense>
        </Route>
        <Route path="/">
          {localStorage.getItem("token") ? (
            <Suspense fallback={<CarregandoPagina />}>
              <Layout>
                <RotasAutenticadas />
              </Layout>
            </Suspense>
          ) : (
            <Redirect to="/login" />
          )}
        </Route>
      </Switch>
    </BrowserRouter>
  );
}

export default App;