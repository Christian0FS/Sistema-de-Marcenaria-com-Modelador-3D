import React, { lazy, Suspense } from "react";
import { BrowserRouter, Switch, Route, Redirect } from 'react-router-dom';
const Kanban = lazy(() => import('./pages/Kanban'));
const EditorModulo = lazy(() => import('./pages/EditorModulo'));
const BibliotecaModulos = lazy(() => import('./pages/BibliotecaModulos'));
const DetalheProjeto = lazy(() => import('./pages/DetalheProjeto'));
const Login = lazy(() => import('./pages/Login'));

function CarregandoPagina() {
  return <p className="p-4 text-sm text-gray-500">Carregando...</p>;
}

function RotasAutenticadas() {
  return (
    <Switch>
      <Route exact path="/" component={Kanban} />
      <Route exact path="/projetos/:projetoId" component={DetalheProjeto} />
      <Route exact path="/editor" component={EditorModulo} />
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
    </Switch>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Switch>
        <Route exact path="/login">
          <Suspense fallback={<CarregandoPagina />}><Login /></Suspense>
        </Route>
        <Route path="/">
          {localStorage.getItem("token") ? (
            <Suspense fallback={<CarregandoPagina />}><RotasAutenticadas /></Suspense>
          ) : (
            <Redirect to="/login" />
          )}
        </Route>
      </Switch>
    </BrowserRouter>
  );
}

export default App;