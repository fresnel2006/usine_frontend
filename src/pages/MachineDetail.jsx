import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Cog, Info, Pencil, Trash2, Wrench } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useSuppression } from '../hooks/useSuppression'
import { formatDateHeure, formatDuree } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Onglets from '../components/Onglets'
import ConfirmDialog from '../components/ConfirmDialog'
import { Chargement, Erreur, LectureSeule } from '../components/Etats'
import { FormulaireMachine } from './Machines'

export default function MachineDetail() {
  const { num } = useParams()
  const navigate = useNavigate()
  const droits = useDroits('machines')
  const { donnees, chargement, erreur, recharger } = useApi({ machine: `/machines/${num}`, lignes: '/lignes' })
  const [onglet, setOnglet] = useState('infos')
  const [edition, setEdition] = useState(false)
  const suppression = useSuppression(() => navigate('/machines'))
  const m = donnees.machine

  if (chargement) return <Chargement />
  if (erreur) return <Erreur message={erreur} />

  return (
    <>
      <PageHeader
        titre={m.designation}
        sousTitre={
          <span className="row" style={{ flexWrap: 'wrap' }}>
            <span className="chip">Machine {m.num_machine}</span>
            <span className="badge badge-primary">Ligne {m.num_ligne}</span>
            <span className="badge">{m.atelier_libelle}</span>
          </span>
        }
        retour={{ chemin: '/machines', libelle: 'Machines' }}
        icone={Cog}
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
            onClick={() => suppression.demander(`/machines/${m.num_machine}`, `Supprimer la machine ${m.designation} ?`, 'Machine supprimée avec succès.')}
          >
            <Trash2 size={18} /> Supprimer
          </button>
        )}
      </PageHeader>
      {droits.lectureSeule && <LectureSeule />}

      <Onglets
        onglets={[
          { cle: 'infos', libelle: 'Informations', icone: Info },
          { cle: 'maintenances', libelle: 'Maintenances', icone: Wrench, nombre: m.maintenances.length },
        ]}
        actif={onglet}
        onChange={setOnglet}
      />

      {onglet === 'infos' ? (
        <section className="panel panel-body">
          <dl className="details">
            <dt>N° machine</dt>
            <dd>{m.num_machine}</dd>
            <dt>Désignation</dt>
            <dd>{m.designation}</dd>
            <dt>Ligne</dt>
            <dd>
              <Link to={`/lignes/${m.num_ligne}`}>Ligne {m.num_ligne}</Link> - {m.atelier_libelle}
            </dd>
            <dt>Dernière maintenance</dt>
            <dd>{m.derniere_maintenance ? formatDateHeure(m.derniere_maintenance) : 'Jamais'}</dd>
          </dl>
        </section>
      ) : (
        <DataTable
          columns={[
            { cle: 'num_maintenance', libelle: 'N°', largeur: 90, rendu: (x) => <span className="chip">{x.num_maintenance}</span> },
            { cle: 'date_heure_debut', libelle: 'Début', rendu: (x) => formatDateHeure(x.date_heure_debut) },
            { cle: 'duree', libelle: 'Durée', align: 'right', rendu: (x) => formatDuree(x.duree) },
          ]}
          rows={m.maintenances}
          rowKey={(x) => x.num_maintenance}
          recherche={false}
          onRowClick={(x) => navigate(`/maintenances/${x.num_maintenance}`)}
          vide="Aucune maintenance sur cette machine."
          videIcone={Wrench}
        />
      )}

      {edition && (
        <FormulaireMachine
          machine={m}
          lignes={donnees.lignes}
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
