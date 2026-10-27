import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Boxes, Cog, Info, Pencil, Rows3, Trash2 } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useSuppression } from '../hooks/useSuppression'
import { formatDate } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Onglets from '../components/Onglets'
import ConfirmDialog from '../components/ConfirmDialog'
import { Chargement, Erreur, LectureSeule } from '../components/Etats'
import { FormulaireLigne } from './Lignes'

export default function LigneDetail() {
  const { num } = useParams()
  const navigate = useNavigate()
  const droits = useDroits('lignes')
  const { donnees, chargement, erreur, recharger } = useApi({ ligne: `/lignes/${num}`, ateliers: '/ateliers' })
  const [onglet, setOnglet] = useState('infos')
  const [edition, setEdition] = useState(false)
  const suppression = useSuppression(() => navigate('/lignes'))
  const ligne = donnees.ligne

  if (chargement) return <Chargement />
  if (erreur) return <Erreur message={erreur} />

  return (
    <>
      <PageHeader
        titre={`Ligne de production ${ligne.num_ligne}`}
        sousTitre={
          <span className="row" style={{ flexWrap: 'wrap' }}>
            <span className="badge badge-primary">{ligne.atelier_libelle}</span>
            <span className="badge">{ligne.nb_operateurs_necessaires} opérateur(s) nécessaire(s)</span>
          </span>
        }
        retour={{ chemin: '/lignes', libelle: 'Lignes de production' }}
        icone={Rows3}
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
            onClick={() =>
              suppression.demander(`/lignes/${ligne.num_ligne}`, `Supprimer la ligne de production ${ligne.num_ligne} ?`, 'Ligne de production supprimée avec succès.')
            }
          >
            <Trash2 size={18} /> Supprimer
          </button>
        )}
      </PageHeader>
      {droits.lectureSeule && <LectureSeule />}

      <Onglets
        onglets={[
          { cle: 'infos', libelle: 'Informations', icone: Info },
          { cle: 'machines', libelle: 'Machines', icone: Cog, nombre: ligne.machines.length },
          { cle: 'lots', libelle: 'Lots', icone: Boxes, nombre: ligne.lots.length },
        ]}
        actif={onglet}
        onChange={setOnglet}
      />

      {onglet === 'infos' && (
        <section className="panel panel-body">
          <dl className="details">
            <dt>N° ligne</dt>
            <dd>{ligne.num_ligne}</dd>
            <dt>Atelier</dt>
            <dd>
              {ligne.num_atelier} - {ligne.atelier_libelle}
            </dd>
            <dt>Opérateurs nécessaires</dt>
            <dd>{ligne.nb_operateurs_necessaires}</dd>
            <dt>Machines</dt>
            <dd>{ligne.nb_machines}</dd>
            <dt>Lots produits</dt>
            <dd>{ligne.nb_lots}</dd>
          </dl>
        </section>
      )}
      {onglet === 'machines' && (
        <DataTable
          columns={[
            { cle: 'num_machine', libelle: 'N° machine', largeur: 140, rendu: (m) => <span className="chip">{m.num_machine}</span> },
            { cle: 'designation', libelle: 'Désignation', rendu: (m) => <strong>{m.designation}</strong> },
          ]}
          rows={ligne.machines}
          rowKey={(m) => m.num_machine}
          recherche={false}
          onRowClick={(m) => navigate(`/machines/${m.num_machine}`)}
          vide="Aucune machine sur cette ligne."
          videIcone={Cog}
        />
      )}
      {onglet === 'lots' && (
        <DataTable
          columns={[
            { cle: 'num_lot', libelle: 'N° lot', largeur: 120, rendu: (l) => <span className="chip">{l.num_lot}</span> },
            { cle: 'date_production', libelle: 'Date', rendu: (l) => formatDate(l.date_production) },
            { cle: 'designation_produit', libelle: 'Produit' },
          ]}
          rows={ligne.lots}
          rowKey={(l) => l.num_lot}
          recherche={false}
          onRowClick={(l) => navigate(`/lots/${l.num_lot}`)}
          vide="Aucun lot produit sur cette ligne."
          videIcone={Boxes}
        />
      )}

      {edition && (
        <FormulaireLigne
          ligne={ligne}
          ateliers={donnees.ateliers}
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
