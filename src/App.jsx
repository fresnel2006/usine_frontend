import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireRole from './components/RequireRole'
import { useAuth } from './context/AuthContext'
import { ACCES_PAGES } from './utils/permissions'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Ateliers from './pages/Ateliers'
import AtelierDetail from './pages/AtelierDetail'
import Lignes from './pages/Lignes'
import LigneDetail from './pages/LigneDetail'
import Lots from './pages/Lots'
import LotDetail from './pages/LotDetail'
import Produits from './pages/Produits'
import ProduitDetail from './pages/ProduitDetail'
import Operateurs from './pages/Operateurs'
import OperateurDetail from './pages/OperateurDetail'
import Equipes from './pages/Equipes'
import EquipeDetail from './pages/EquipeDetail'
import Incidents from './pages/Incidents'
import IncidentDetail from './pages/IncidentDetail'
import TypesIncident from './pages/TypesIncident'
import Machines from './pages/Machines'
import MachineDetail from './pages/MachineDetail'
import Maintenances from './pages/Maintenances'
import MaintenanceDetail from './pages/MaintenanceDetail'
import Pieces from './pages/Pieces'
import PieceDetail from './pages/PieceDetail'
import Fournisseurs from './pages/Fournisseurs'
import FournisseurDetail from './pages/FournisseurDetail'
import Utilisateurs from './pages/Utilisateurs'
import Profil from './pages/Profil'
import AccesRefuse from './pages/AccesRefuse'
import PageIntrouvable from './pages/PageIntrouvable'

/** "/" : tableau de bord si connecté, sinon connexion. */
function Accueil() {
  const { utilisateur } = useAuth()
  return <Navigate to={utilisateur ? '/tableau-de-bord' : '/connexion'} replace />
}

// Routes de la section 9.3. Toutes, sauf /connexion, exigent d'être connecté.
export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<Login />} />
      <Route path="/" element={<Accueil />} />
      <Route
        element={
          <RequireRole>
            <Layout />
          </RequireRole>
        }
      >
        <Route path="/tableau-de-bord" element={<Dashboard />} />
        <Route path="/ateliers" element={<Ateliers />} />
        <Route path="/ateliers/:num" element={<AtelierDetail />} />
        <Route path="/lignes" element={<Lignes />} />
        <Route path="/lignes/:num" element={<LigneDetail />} />
        <Route path="/lots" element={<Lots />} />
        <Route path="/lots/:num" element={<LotDetail />} />
        <Route path="/produits" element={<Produits />} />
        <Route path="/produits/:ref" element={<ProduitDetail />} />
        <Route path="/operateurs" element={<Operateurs />} />
        <Route path="/operateurs/:matricule" element={<OperateurDetail />} />
        <Route path="/equipes" element={<Equipes />} />
        <Route path="/equipes/:num" element={<EquipeDetail />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/incidents/:num" element={<IncidentDetail />} />
        <Route path="/types-incident" element={<TypesIncident />} />
        <Route path="/machines" element={<Machines />} />
        <Route path="/machines/:num" element={<MachineDetail />} />
        <Route path="/maintenances" element={<Maintenances />} />
        <Route path="/maintenances/:num" element={<MaintenanceDetail />} />
        <Route path="/pieces" element={<Pieces />} />
        <Route path="/pieces/:ref" element={<PieceDetail />} />
        <Route path="/fournisseurs" element={<Fournisseurs />} />
        <Route path="/fournisseurs/:code" element={<FournisseurDetail />} />
        <Route
          path="/utilisateurs"
          element={
            <RequireRole roles={ACCES_PAGES.utilisateurs}>
              <Utilisateurs />
            </RequireRole>
          }
        />
        <Route path="/profil" element={<Profil />} />
        <Route path="/acces-refuse" element={<AccesRefuse />} />
        <Route path="*" element={<PageIntrouvable />} />
      </Route>
    </Routes>
  )
}
