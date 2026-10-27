import {
  Boxes,
  CircleUserRound,
  Cog,
  Factory,
  LayoutDashboard,
  Package,
  Rows3,
  ShieldCheck,
  TriangleAlert,
  Truck,
  UserRound,
  Users,
  Warehouse,
  Wrench,
} from 'lucide-react'
import { ACCES_PAGES } from '../utils/permissions'

// Barre latérale (section 3). « roles » : entrée visible seulement pour ces rôles ; sinon pour tous.
// « singulier » sert au fil d'Ariane des fiches : Tableau de bord > Ateliers > Atelier 10.
export const MENU = [
  {
    titre: null,
    entrees: [{ chemin: '/tableau-de-bord', libelle: 'Tableau de bord', icone: LayoutDashboard }],
  },
  {
    titre: 'Production',
    entrees: [
      { chemin: '/ateliers', libelle: 'Ateliers', singulier: 'Atelier', icone: Factory },
      { chemin: '/lignes', libelle: 'Lignes de production', singulier: 'Ligne', icone: Rows3 },
      { chemin: '/lots', libelle: 'Lots de production', singulier: 'Lot', icone: Boxes },
      { chemin: '/produits', libelle: 'Produits', singulier: 'Produit', icone: Package },
    ],
  },
  {
    titre: 'Personnel',
    entrees: [
      { chemin: '/operateurs', libelle: 'Opérateurs', singulier: 'Opérateur', icone: UserRound },
      { chemin: '/equipes', libelle: 'Équipes', singulier: 'Équipe', icone: Users },
    ],
  },
  {
    titre: 'Maintenance',
    entrees: [
      { chemin: '/incidents', libelle: 'Incidents', singulier: 'Incident', icone: TriangleAlert },
      { chemin: '/machines', libelle: 'Machines', singulier: 'Machine', icone: Cog },
      { chemin: '/maintenances', libelle: 'Maintenances', singulier: 'Maintenance', icone: Wrench },
      { chemin: '/pieces', libelle: 'Pièces et stock', singulier: 'Pièce', icone: Warehouse },
      { chemin: '/fournisseurs', libelle: 'Fournisseurs', singulier: 'Fournisseur', icone: Truck },
    ],
  },
  {
    titre: 'Administration',
    entrees: [{ chemin: '/utilisateurs', libelle: 'Utilisateurs', icone: ShieldCheck, roles: ACCES_PAGES.utilisateurs }],
  },
  {
    titre: null,
    entrees: [{ chemin: '/profil', libelle: 'Mon profil', icone: CircleUserRound }],
  },
]

// Pages hors menu, pour le fil d'Ariane
export const AUTRES_PAGES = [
  { chemin: '/types-incident', libelle: "Types d'incident", groupe: 'Maintenance' },
  { chemin: '/acces-refuse', libelle: 'Accès refusé' },
]
