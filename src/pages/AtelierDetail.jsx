import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Factory, Info, Pencil, Rows3, Trash2 } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useSuppression } from '../hooks/useSuppression'
import { nomComplet } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Onglets from '../components/Onglets'
import ConfirmDialog from '../components/ConfirmDialog'
import { Chargement, Erreur, LectureSeule } from '../components/Etats'
import { FormulaireAtelier } from './Ateliers'

export default function AtelierDetail() {
  const { num } = useParams()
  const navigate = useNavigate()
  const droits = useDroits('ateliers')
  const { donnees, chargement, erreur, recharger } = useApi({ atelier: `/ateliers/${num}`, lignes: `/lignes?atelier=${num}` })
  const [onglet, setOnglet] = useState('infos')
  const [edition, setEdition] = useState(false)
  const suppression = useSuppression(() => navigate('/ateliers'))
  const atelier = donnees.atelier

  if (chargement) return <Chargement />
  if (erreur) return <Erreur message={erreur} />

  return (
    <>
      <PageHeader
        titre={atelier.libelle}
        sousTitre={
          <span className="row" style={{ flexWrap: 'wrap' }}>
            <span className="chip">Atelier {atelier.num_atelier}</span>
            <span className="badge badge-primary">{atelier.nb_lignes} ligne(s)</span>
          </span>
        }
        retour={{ chemin: '/ateliers', libelle: 'Ateliers' }}
        icone={Factory}
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
              suppression.demander(`/ateliers/${atelier.num_atelier}`, `Supprimer l'atelier ${atelier.libelle} ?`, 'Atelier supprimé avec succès.')
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
          { cle: 'lignes', libelle: 'Lignes de production', icone: Rows3, nombre: donnees.lignes.length },
        ]}
        actif={onglet}
        onChange={setOnglet}
      />

      {onglet === 'infos' ? (
        <section className="panel panel-body">
          <dl className="details">
            <dt>N° atelier</dt>
            <dd>{atelier.num_atelier}</dd>
            <dt>Libellé</dt>
            <dd>{atelier.libelle}</dd>
            <dt>Responsable</dt>
            <dd>
              {nomComplet(atelier.responsable)} ({atelier.matricule_responsable})
            </dd>
            <dt>Lignes de production</dt>
            <dd>{atelier.nb_lignes}</dd>
          </dl>
        </section>
      ) : (
        <DataTable
          columns={[
            { cle: 'num_ligne', libelle: 'N° ligne', largeur: 120, rendu: (l) => <span className="chip">{l.num_ligne}</span> },
            { cle: 'nb_operateurs_necessaires', libelle: 'Opérateurs nécessaires', align: 'right' },
            { cle: 'nb_machines', libelle: 'Machines', align: 'right' },
            { cle: 'nb_lots', libelle: 'Lots', align: 'right' },
          ]}
          rows={donnees.lignes}
          rowKey={(l) => l.num_ligne}
          recherche={false}
          onRowClick={(l) => navigate(`/lignes/${l.num_ligne}`)}
          vide="Aucune ligne de production dans cet atelier."
          videIcone={Rows3}
        />
      )}

      {edition && (
        <FormulaireAtelier
          atelier={atelier}
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
