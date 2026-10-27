import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { Boxes, Plus } from 'lucide-react'
import api from '../api/client'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useEdition } from '../hooks/useEdition'
import { useSuppression } from '../hooks/useSuppression'
import { regleNombre, useSoumission } from '../hooks/useSoumission'
import { aujourdhui, formatDate, nomComplet } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal, { PiedFormulaire } from '../components/Modal'
import FormField from '../components/FormField'
import Selecteur from '../components/Selecteur'
import ConfirmDialog from '../components/ConfirmDialog'
import Actions from '../components/Actions'
import { Erreur, LectureSeule } from '../components/Etats'

export function EtiquettesOperateurs({ operateurs }) {
  return (
    <div className="etiquettes">
      {operateurs.map((o) => (
        <span key={o.matricule} className="badge badge-primary sans-point" title={o.matricule}>
          {nomComplet(o)}
        </span>
      ))}
    </div>
  )
}

/** Formulaire long : fenêtre centrée. */
export function FormulaireLot({ lot, onFermer, onEnregistre }) {
  const modification = Boolean(lot)
  const { donnees } = useApi({ lignes: '/lignes', produits: '/produits', operateurs: '/operateurs' })
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: lot
      ? {
          num_lot: lot.num_lot,
          date_production: lot.date_production,
          num_ligne: String(lot.num_ligne),
          reference_produit: lot.reference_produit,
          operateurs: lot.operateurs.map((o) => o.matricule),
        }
      : { num_lot: '', date_production: aujourdhui(), num_ligne: '', reference_produit: '', operateurs: [] },
  })

  const soumettre = async (v) => {
    const corps = {
      date_production: v.date_production,
      num_ligne: Number(v.num_ligne),
      reference_produit: v.reference_produit,
      operateurs: v.operateurs,
    }
    const ok = await executer(
      () => (modification ? api.put(`/lots/${lot.num_lot}`, corps) : api.post('/lots', { ...corps, num_lot: v.num_lot })),
      { setError, succes: 'Lot de production enregistré avec succès.' },
    )
    if (ok) onEnregistre(ok)
  }

  return (
    <Modal
      ouvert
      large
      titre={modification ? `Modifier le lot ${lot.num_lot}` : 'Nouveau lot de production'}
      sousTitre="Au moins un opérateur participe à chaque lot."
      icone={Boxes}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-lot" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-lot" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        <FormField label="N° lot" htmlFor="num_lot" required error={errors.num_lot}>
          <input
            id="num_lot"
            type="number"
            className={`input ${errors.num_lot ? 'invalid' : ''}`}
            disabled={modification}
            {...register('num_lot', modification ? {} : regleNombre({ minExclusif: 0, libelle: 'Le numéro' }))}
          />
        </FormField>
        <FormField label="Date de production" htmlFor="date_production" required error={errors.date_production}>
          <input
            id="date_production"
            type="date"
            className={`input ${errors.date_production ? 'invalid' : ''}`}
            {...register('date_production', { required: 'La date est obligatoire.' })}
          />
        </FormField>
        <FormField label="Ligne" htmlFor="num_ligne" required error={errors.num_ligne}>
          <Controller
            name="num_ligne"
            control={control}
            rules={{ required: 'Choisissez une ligne.' }}
            render={({ field }) => (
              <Selecteur
                id="num_ligne"
                options={(donnees.lignes || []).map((l) => ({ valeur: String(l.num_ligne), libelle: `Ligne ${l.num_ligne}`, detail: l.atelier_libelle }))}
                valeur={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalide={Boolean(errors.num_ligne)}
                placeholder="Rechercher une ligne"
              />
            )}
          />
        </FormField>
        <FormField label="Produit" htmlFor="reference_produit" required error={errors.reference_produit}>
          <Controller
            name="reference_produit"
            control={control}
            rules={{ required: 'Choisissez un produit.' }}
            render={({ field }) => (
              <Selecteur
                id="reference_produit"
                options={(donnees.produits || []).map((p) => ({ valeur: p.reference, libelle: p.designation, detail: p.reference }))}
                valeur={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalide={Boolean(errors.reference_produit)}
                placeholder="Rechercher un produit"
              />
            )}
          />
        </FormField>
        <FormField label="Opérateurs" htmlFor="operateurs" required className="full" error={errors.operateurs}>
          <Controller
            name="operateurs"
            control={control}
            rules={{ validate: (v) => v.length > 0 || 'Choisissez au moins un opérateur.' }}
            render={({ field }) => (
              <Selecteur
                id="operateurs"
                multiple
                options={(donnees.operateurs || []).map((o) => ({ valeur: o.matricule, libelle: nomComplet(o), detail: `${o.matricule} - ${o.equipe_libelle}` }))}
                valeur={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalide={Boolean(errors.operateurs)}
                placeholder="Rechercher un opérateur"
              />
            )}
          />
        </FormField>
      </form>
    </Modal>
  )
}

export default function Lots() {
  const navigate = useNavigate()
  const droits = useDroits('lots')
  const { donnees, chargement, erreur, recharger } = useApi({ lots: '/lots', lignes: '/lignes', produits: '/produits' })
  const [filtres, setFiltres] = useState({ debut: '', fin: '', ligne: '', produit: '' })
  const [edition, setEdition] = useEdition(droits.creer)
  const suppression = useSuppression(recharger)
  const changer = (cle) => (e) => setFiltres((f) => ({ ...f, [cle]: e.target.value }))
  const actifs = Object.values(filtres).some(Boolean)

  const lots = (donnees.lots || []).filter(
    (l) =>
      (!filtres.debut || l.date_production >= filtres.debut) &&
      (!filtres.fin || l.date_production <= filtres.fin) &&
      (!filtres.ligne || l.num_ligne === Number(filtres.ligne)) &&
      (!filtres.produit || l.reference_produit === filtres.produit),
  )

  const colonnes = [
    { cle: 'num_lot', libelle: 'N° lot', largeur: 110, rendu: (l) => <span className="chip">{l.num_lot}</span> },
    { cle: 'date_production', libelle: 'Date', rendu: (l) => formatDate(l.date_production) },
    {
      cle: 'num_ligne',
      libelle: 'Ligne',
      rendu: (l) => (
        <div>
          <div className="personne-nom">Ligne {l.num_ligne}</div>
          <div className="personne-detail">{l.atelier_libelle}</div>
        </div>
      ),
    },
    { cle: 'designation_produit', libelle: 'Produit', rendu: (l) => <strong>{l.designation_produit}</strong> },
    {
      cle: 'operateurs',
      libelle: 'Opérateurs',
      triable: false,
      valeur: (l) => l.operateurs.map(nomComplet).join(' '),
      rendu: (l) => <EtiquettesOperateurs operateurs={l.operateurs} />,
    },
  ]

  return (
    <>
      <PageHeader titre="Lots de production" icone={Boxes} sousTitre="Chaque lot est produit sur une ligne, pour un produit, par au moins un opérateur.">
        {droits.creer && (
          <button type="button" className="btn btn-primary" onClick={() => setEdition({})}>
            <Plus size={18} /> Ajouter
          </button>
        )}
      </PageHeader>
      {droits.lectureSeule && <LectureSeule />}

      {erreur ? (
        <Erreur message={erreur} />
      ) : (
        <DataTable
          columns={colonnes}
          rows={lots}
          rowKey={(l) => l.num_lot}
          chargement={chargement}
          onRowClick={(l) => navigate(`/lots/${l.num_lot}`)}
          rechercheTexte="Rechercher un lot, un produit, un opérateur"
          vide="Aucun lot de production enregistré pour le moment."
          videIcone={Boxes}
          videAction={
            droits.creer && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdition({})}>
                <Plus size={18} /> Ajouter le premier lot
              </button>
            )
          }
          filtres={
            <>
              <input type="date" className="input" value={filtres.debut} onChange={changer('debut')} aria-label="Du" title="Du" />
              <input type="date" className="input" value={filtres.fin} onChange={changer('fin')} aria-label="Au" title="Au" />
              <select className="select" value={filtres.ligne} onChange={changer('ligne')} aria-label="Filtrer par ligne">
                <option value="">Toutes les lignes</option>
                {(donnees.lignes || []).map((l) => (
                  <option key={l.num_ligne} value={l.num_ligne}>
                    Ligne {l.num_ligne}
                  </option>
                ))}
              </select>
              <select className="select" value={filtres.produit} onChange={changer('produit')} aria-label="Filtrer par produit">
                <option value="">Tous les produits</option>
                {(donnees.produits || []).map((p) => (
                  <option key={p.reference} value={p.reference}>
                    {p.designation}
                  </option>
                ))}
              </select>
              {actifs && (
                <button type="button" className="btn btn-ghost" onClick={() => setFiltres({ debut: '', fin: '', ligne: '', produit: '' })}>
                  Réinitialiser
                </button>
              )}
            </>
          }
          actions={(l) => (
            <Actions
              voir={() => navigate(`/lots/${l.num_lot}`)}
              modifier={droits.modifier && (() => setEdition({ lot: l }))}
              supprimer={
                droits.supprimer &&
                (() => suppression.demander(`/lots/${l.num_lot}`, `Supprimer le lot ${l.num_lot} ?`, 'Lot de production supprimé avec succès.'))
              }
            />
          )}
        />
      )}

      {edition && (
        <FormulaireLot
          lot={edition.lot}
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
