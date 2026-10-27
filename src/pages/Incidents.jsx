import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { ChartColumn, List, Plus, Tags, TriangleAlert } from 'lucide-react'
import api from '../api/client'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useEdition } from '../hooks/useEdition'
import { useSuppression } from '../hooks/useSuppression'
import { regleNombre, useSoumission } from '../hooks/useSoumission'
import { formatDate, formatDuree } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal, { PiedFormulaire } from '../components/Modal'
import FormField from '../components/FormField'
import Selecteur from '../components/Selecteur'
import Onglets from '../components/Onglets'
import ConfirmDialog from '../components/ConfirmDialog'
import Actions from '../components/Actions'
import { Erreur, LectureSeule } from '../components/Etats'

export function FormulaireIncident({ incident, onFermer, onEnregistre }) {
  const modification = Boolean(incident)
  const { donnees } = useApi({ lots: '/lots', types: '/types-incident' })
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: incident
      ? { num_lot: String(incident.num_lot), code_type: incident.code_type, temps_arret: incident.temps_arret }
      : { num_lot: '', code_type: '', temps_arret: '' },
  })

  const soumettre = async (v) => {
    const corps = { num_lot: Number(v.num_lot), code_type: v.code_type, temps_arret: v.temps_arret }
    const ok = await executer(
      () => (modification ? api.put(`/incidents/${incident.num_incident}`, corps) : api.post('/incidents', corps)),
      { setError, succes: modification ? 'Incident enregistré avec succès.' : 'Incident déclaré avec succès.' },
    )
    if (ok) onEnregistre(ok)
  }

  return (
    <Modal
      ouvert
      panneau
      titre={modification ? `Modifier l'incident ${incident.num_incident}` : 'Déclarer un incident'}
      sousTitre="Un incident concerne un et un seul lot."
      icone={TriangleAlert}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-incident" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-incident" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        <FormField label="Lot" htmlFor="num_lot" required error={errors.num_lot}>
          <Controller
            name="num_lot"
            control={control}
            rules={{ required: 'Choisissez le lot concerné.' }}
            render={({ field }) => (
              <Selecteur
                id="num_lot"
                options={(donnees.lots || []).map((l) => ({
                  valeur: String(l.num_lot),
                  libelle: `Lot ${l.num_lot} - ${l.designation_produit}`,
                  detail: formatDate(l.date_production),
                }))}
                valeur={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalide={Boolean(errors.num_lot)}
                placeholder="Rechercher un lot"
              />
            )}
          />
        </FormField>
        <FormField label="Type d'incident" htmlFor="code_type" required error={errors.code_type}>
          <Controller
            name="code_type"
            control={control}
            rules={{ required: "Choisissez le type d'incident." }}
            render={({ field }) => (
              <Selecteur
                id="code_type"
                options={(donnees.types || []).map((t) => ({ valeur: t.code_type, libelle: t.libelle, detail: t.code_type }))}
                valeur={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalide={Boolean(errors.code_type)}
                placeholder="Rechercher un type"
              />
            )}
          />
        </FormField>
        <FormField label="Temps d'arrêt (minutes)" htmlFor="temps_arret" required error={errors.temps_arret}>
          <input
            id="temps_arret"
            type="number"
            min="1"
            className={`input ${errors.temps_arret ? 'invalid' : ''}`}
            {...register('temps_arret', regleNombre({ minExclusif: 0, libelle: "Le temps d'arrêt", message: "Le temps d'arrêt doit être supérieur à 0." }))}
          />
        </FormField>
      </form>
    </Modal>
  )
}

function TableauTotaux({ titre, lignes }) {
  return (
    <section className="stack" style={{ gap: 12 }}>
      <h2>{titre}</h2>
      <DataTable
        columns={[
          { cle: 'libelle', libelle: 'Élément', rendu: (s) => <strong>{s.libelle}</strong> },
          { cle: 'nb_incidents', libelle: 'Incidents', align: 'right' },
          { cle: 'temps_arret_total', libelle: "Temps d'arrêt", align: 'right', rendu: (s) => formatDuree(s.temps_arret_total) },
        ]}
        rows={lignes}
        rowKey={(s) => s.cle}
        recherche={false}
        vide="Aucun incident."
      />
    </section>
  )
}

export default function Incidents() {
  const navigate = useNavigate()
  const droits = useDroits('incidents')
  const droitsTypes = useDroits('types_incident')
  const { donnees, chargement, erreur, recharger } = useApi({
    incidents: '/incidents',
    stats: '/incidents/statistiques',
    types: '/types-incident',
    ateliers: '/ateliers',
  })
  const [onglet, setOnglet] = useState('liste')
  const [filtres, setFiltres] = useState({ type: '', atelier: '', lot: '' })
  const [edition, setEdition] = useEdition(droits.creer)
  const suppression = useSuppression(recharger)
  const changer = (cle) => (e) => setFiltres((f) => ({ ...f, [cle]: e.target.value }))
  const ateliers = donnees.ateliers || []
  const libelleAtelier = ateliers.find((a) => String(a.num_atelier) === filtres.atelier)?.libelle

  const incidents = (donnees.incidents || []).filter(
    (i) =>
      (!filtres.type || i.code_type === filtres.type) &&
      (!libelleAtelier || i.atelier_libelle === libelleAtelier) &&
      (!filtres.lot || String(i.num_lot).includes(filtres.lot.trim())),
  )

  const colonnes = [
    { cle: 'num_incident', libelle: 'N°', largeur: 80, rendu: (i) => <span className="chip">{i.num_incident}</span> },
    {
      cle: 'num_lot',
      libelle: 'Lot',
      rendu: (i) => (
        <div>
          <div className="personne-nom">Lot {i.num_lot}</div>
          <div className="personne-detail">{i.designation_produit}</div>
        </div>
      ),
    },
    { cle: 'type_libelle', libelle: 'Type', rendu: (i) => <span className="badge badge-primary sans-point">{i.type_libelle}</span> },
    { cle: 'temps_arret', libelle: "Temps d'arrêt (min)", align: 'right', rendu: (i) => <strong>{i.temps_arret}</strong> },
    { cle: 'num_ligne', libelle: 'Ligne', rendu: (i) => `Ligne ${i.num_ligne}` },
    { cle: 'atelier_libelle', libelle: 'Atelier' },
  ]

  return (
    <>
      <PageHeader titre="Incidents" icone={TriangleAlert} sousTitre="Chaque incident concerne un seul lot et provoque un temps d'arrêt.">
        <Link to="/types-incident" className="btn btn-secondary">
          <Tags size={18} /> Types d'incident
        </Link>
        {droits.creer && (
          <button type="button" className="btn btn-primary" onClick={() => setEdition({})}>
            <Plus size={18} /> Déclarer un incident
          </button>
        )}
      </PageHeader>
      {droits.lectureSeule && droitsTypes.lectureSeule && <LectureSeule />}

      {erreur ? (
        <Erreur message={erreur} />
      ) : (
        <>
          <Onglets
            onglets={[
              { cle: 'liste', libelle: 'Liste', icone: List, nombre: (donnees.incidents || []).length },
              { cle: 'totaux', libelle: "Totaux des temps d'arrêt", icone: ChartColumn },
            ]}
            actif={onglet}
            onChange={setOnglet}
          />
          {onglet === 'liste' ? (
            <DataTable
              columns={colonnes}
              rows={incidents}
              rowKey={(i) => i.num_incident}
              chargement={chargement}
              onRowClick={(i) => navigate(`/incidents/${i.num_incident}`)}
              rechercheTexte="Rechercher un incident"
              vide="Aucun incident déclaré pour le moment."
              videIcone={TriangleAlert}
              videAction={
                droits.creer && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdition({})}>
                    <Plus size={18} /> Déclarer le premier incident
                  </button>
                )
              }
              filtres={
                <>
                  <select className="select" value={filtres.type} onChange={changer('type')} aria-label="Filtrer par type">
                    <option value="">Tous les types</option>
                    {(donnees.types || []).map((t) => (
                      <option key={t.code_type} value={t.code_type}>
                        {t.libelle}
                      </option>
                    ))}
                  </select>
                  <select className="select" value={filtres.atelier} onChange={changer('atelier')} aria-label="Filtrer par atelier">
                    <option value="">Tous les ateliers</option>
                    {ateliers.map((a) => (
                      <option key={a.num_atelier} value={a.num_atelier}>
                        {a.libelle}
                      </option>
                    ))}
                  </select>
                  <input className="input" inputMode="numeric" placeholder="N° de lot" value={filtres.lot} onChange={changer('lot')} aria-label="Filtrer par lot" />
                  {Object.values(filtres).some(Boolean) && (
                    <button type="button" className="btn btn-ghost" onClick={() => setFiltres({ type: '', atelier: '', lot: '' })}>
                      Réinitialiser
                    </button>
                  )}
                </>
              }
              actions={(i) => (
                <Actions
                  voir={() => navigate(`/incidents/${i.num_incident}`)}
                  modifier={droits.modifier && (() => setEdition({ incident: i }))}
                  supprimer={
                    droits.supprimer &&
                    (() =>
                      suppression.demander(
                        `/incidents/${i.num_incident}`,
                        `Supprimer l'incident ${i.num_incident} (${i.type_libelle}, lot ${i.num_lot}) ?`,
                        'Incident supprimé avec succès.',
                      ))
                  }
                />
              )}
            />
          ) : (
            <div className="stack">
              <p className="muted">Temps d'arrêt cumulé, tous incidents confondus : {formatDuree(donnees.stats?.total_minutes ?? 0)}.</p>
              <div className="grid-2">
                <TableauTotaux titre="Par atelier" lignes={donnees.stats?.par_atelier || []} />
                <TableauTotaux titre="Par ligne" lignes={donnees.stats?.par_ligne || []} />
              </div>
              <TableauTotaux titre="Par lot" lignes={donnees.stats?.par_lot || []} />
            </div>
          )}
        </>
      )}

      {edition && (
        <FormulaireIncident
          incident={edition.incident}
          onFermer={() => setEdition(null)}
          onEnregistre={() => {
            setEdition(null)
            recharger()
          }}
        />
      )}
      <ConfirmDialog {...suppression.dialogue} />
    </>
  )
}
