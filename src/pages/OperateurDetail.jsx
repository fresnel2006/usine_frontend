import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Boxes, Info, Pencil, Trash2, UserRound, Wrench } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useSuppression } from '../hooks/useSuppression'
import { formatAnciennete, formatDate, formatDateHeure, formatDuree, nomComplet } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Onglets from '../components/Onglets'
import ConfirmDialog from '../components/ConfirmDialog'
import { Chargement, Erreur, LectureSeule } from '../components/Etats'
import { FormulaireOperateur } from './Operateurs'

export default function OperateurDetail() {
  const { matricule } = useParams()
  const navigate = useNavigate()
  const droits = useDroits('operateurs')
  const code = encodeURIComponent(matricule)
  const { donnees, chargement, erreur, recharger } = useApi({ operateur: `/operateurs/${code}`, equipes: '/equipes' })
  const [onglet, setOnglet] = useState('infos')
  const [edition, setEdition] = useState(false)
  const suppression = useSuppression(() => navigate('/operateurs'))
  const o = donnees.operateur

  if (chargement) return <Chargement />
  if (erreur) return <Erreur message={erreur} />

  return (
    <>
      <PageHeader
        titre={nomComplet(o)}
        sousTitre={
          <span className="row" style={{ flexWrap: 'wrap' }}>
            <span className="chip">{o.matricule}</span>
            <span className="badge badge-primary">{o.equipe_libelle}</span>
            {o.est_responsable_equipe && <span className="badge badge-dark sans-point">Responsable d'équipe</span>}
            {o.atelier_responsable && <span className="badge badge-dark sans-point">Responsable d'atelier</span>}
          </span>
        }
        retour={{ chemin: '/operateurs', libelle: 'Opérateurs' }}
        icone={UserRound}
      >
        {droits.modifier && (
          <button type="button" className="btn btn-secondary" onClick={() => setEdition(true)}>
            <Pencil size={18} /> Modifier
          </button>
        )}
        {droits.supprimer && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => suppression.demander(`/operateurs/${code}`, `Supprimer l'opérateur ${nomComplet(o)} ?`, 'Opérateur supprimé avec succès.')}
          >
            <Trash2 size={18} /> Supprimer
          </button>
        )}
      </PageHeader>
      {droits.lectureSeule && <LectureSeule />}

      <Onglets
        onglets={[
          { cle: 'infos', libelle: 'Informations', icone: Info },
          { cle: 'lots', libelle: 'Lots réalisés', icone: Boxes, nombre: o.lots.length },
          { cle: 'maintenances', libelle: 'Maintenances effectuées', icone: Wrench, nombre: o.maintenances.length },
        ]}
        actif={onglet}
        onChange={setOnglet}
      />

      {onglet === 'infos' && (
        <section className="panel panel-body">
          <dl className="details">
            <dt>Matricule</dt>
            <dd>{o.matricule}</dd>
            <dt>Nom</dt>
            <dd>{o.nom}</dd>
            <dt>Prénom</dt>
            <dd>{o.prenom}</dd>
            <dt>Date d'entrée</dt>
            <dd>
              {formatDate(o.date_entree)} ({formatAnciennete(o.date_entree)})
            </dd>
            <dt>Équipe</dt>
            <dd>
              {o.equipe_libelle}
              {o.est_responsable_equipe ? ' (responsable)' : ''}
            </dd>
            <dt>Atelier dirigé</dt>
            <dd>{o.atelier_responsable || 'Aucun'}</dd>
            <dt>Compte utilisateur</dt>
            <dd>{o.compte || 'Aucun'}</dd>
          </dl>
        </section>
      )}
      {onglet === 'lots' && (
        <DataTable
          columns={[
            { cle: 'num_lot', libelle: 'N° lot', largeur: 120, rendu: (l) => <span className="chip">{l.num_lot}</span> },
            { cle: 'date_production', libelle: 'Date', rendu: (l) => formatDate(l.date_production) },
            { cle: 'designation_produit', libelle: 'Produit' },
          ]}
          rows={o.lots}
          rowKey={(l) => l.num_lot}
          recherche={false}
          onRowClick={(l) => navigate(`/lots/${l.num_lot}`)}
          vide="Cet opérateur n'a participé à aucun lot."
          videIcone={Boxes}
        />
      )}
      {onglet === 'maintenances' && (
        <DataTable
          columns={[
            { cle: 'num_maintenance', libelle: 'N°', largeur: 90, rendu: (m) => <span className="chip">{m.num_maintenance}</span> },
            { cle: 'designation_machine', libelle: 'Machine' },
            { cle: 'date_heure_debut', libelle: 'Début', rendu: (m) => formatDateHeure(m.date_heure_debut) },
            { cle: 'duree', libelle: 'Durée', align: 'right', rendu: (m) => formatDuree(m.duree) },
          ]}
          rows={o.maintenances}
          rowKey={(m) => m.num_maintenance}
          recherche={false}
          onRowClick={(m) => navigate(`/maintenances/${m.num_maintenance}`)}
          vide="Cet opérateur n'a effectué aucune maintenance."
          videIcone={Wrench}
        />
      )}

      {edition && (
        <FormulaireOperateur
          operateur={o}
          equipes={donnees.equipes}
          onFermer={() => setEdition(false)}
          onEnregistre={() => {
            setEdition(false)
            recharger()
          }}
        />
      )}
      <ConfirmDialog {...suppression.dialogue} />
    </>
  )
}
