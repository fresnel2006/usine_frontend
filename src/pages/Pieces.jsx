import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { Plus, ShoppingCart, Warehouse } from 'lucide-react'
import api from '../api/client'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useEdition } from '../hooks/useEdition'
import { useSuppression } from '../hooks/useSuppression'
import { regleNombre, regleTexte, useSoumission } from '../hooks/useSoumission'
import { aujourdhui, formatFCFA, formatNombre } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal, { PiedFormulaire } from '../components/Modal'
import FormField from '../components/FormField'
import Selecteur from '../components/Selecteur'
import ConfirmDialog from '../components/ConfirmDialog'
import Actions from '../components/Actions'
import { Erreur, LectureSeule } from '../components/Etats'

export const SEUIL_STOCK_PIECE = 5

export function BadgeStockPiece({ stock }) {
  return (
    <span className={`badge ${stock <= SEUIL_STOCK_PIECE ? 'badge-danger' : 'badge-success'}`}>
      {stock === 0 ? 'Rupture' : formatNombre(stock)}
    </span>
  )
}

export function FormulairePiece({ piece, onFermer, onEnregistre }) {
  const modification = Boolean(piece)
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: piece
      ? { reference: piece.reference, libelle: piece.libelle, prix_unitaire_ht: piece.prix_unitaire_ht, quantite_stock: piece.quantite_stock }
      : { reference: '', libelle: '', prix_unitaire_ht: '', quantite_stock: 0 },
  })

  const soumettre = async (v) => {
    const corps = { libelle: v.libelle, prix_unitaire_ht: v.prix_unitaire_ht, quantite_stock: v.quantite_stock }
    const ok = await executer(
      () =>
        modification
          ? api.put(`/pieces/${encodeURIComponent(piece.reference)}`, corps)
          : api.post('/pieces', { ...corps, reference: v.reference }),
      { setError, succes: 'Pièce enregistrée avec succès.' },
    )
    if (ok) onEnregistre(ok)
  }

  return (
    <Modal
      ouvert
      panneau
      titre={modification ? `Modifier la pièce ${piece.reference}` : 'Nouvelle pièce'}
      sousTitre="Le prix et le stock ne peuvent pas être négatifs."
      icone={Warehouse}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-piece" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-piece" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        <FormField label="Référence" htmlFor="reference" required error={errors.reference} hint="Exemple : PCE-ROUL">
          <input
            id="reference"
            className={`input mono ${errors.reference ? 'invalid' : ''}`}
            disabled={modification}
            {...register('reference', modification ? {} : regleTexte('La référence', 20))}
          />
        </FormField>
        <FormField label="Libellé" htmlFor="libelle" required error={errors.libelle}>
          <input id="libelle" className={`input ${errors.libelle ? 'invalid' : ''}`} {...register('libelle', regleTexte('Le libellé', 100))} />
        </FormField>
        <FormField label="Prix unitaire HT (FCFA)" htmlFor="prix" required error={errors.prix_unitaire_ht}>
          <input
            id="prix"
            type="number"
            min="0"
            step="any"
            className={`input ${errors.prix_unitaire_ht ? 'invalid' : ''}`}
            {...register('prix_unitaire_ht', regleNombre({ min: 0, entier: false, libelle: 'Le prix', message: 'Le prix ne peut pas être négatif.' }))}
          />
        </FormField>
        <FormField label="Quantité en stock" htmlFor="stock" required error={errors.quantite_stock}>
          <input
            id="stock"
            type="number"
            min="0"
            className={`input ${errors.quantite_stock ? 'invalid' : ''}`}
            {...register('quantite_stock', regleNombre({ min: 0, libelle: 'La quantité', message: 'Le stock ne peut pas être négatif.' }))}
          />
        </FormField>
      </form>
    </Modal>
  )
}

/** Achat de pièce : création (le stock augmente) ou modification du prix et de la quantité. */
export function FormulaireAchat({ achat, pieceParDefaut, onFermer, onEnregistre }) {
  const modification = Boolean(achat)
  const { donnees } = useApi({ pieces: '/pieces', fournisseurs: '/fournisseurs' })
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: achat
      ? { ...achat }
      : { reference_piece: pieceParDefaut || '', code_fournisseur: '', date_achat: aujourdhui(), prix_achat: '', quantite: 1 },
  })

  const soumettre = async (v) => {
    const url = modification
      ? `/achats/${encodeURIComponent(achat.reference_piece)}/${encodeURIComponent(achat.code_fournisseur)}/${achat.date_achat}`
      : '/achats'
    const ok = await executer(
      () =>
        modification
          ? api.put(url, { prix_achat: v.prix_achat, quantite: v.quantite })
          : api.post(url, {
              reference_piece: v.reference_piece,
              code_fournisseur: v.code_fournisseur,
              date_achat: v.date_achat,
              prix_achat: v.prix_achat,
              quantite: v.quantite,
            }),
      { setError, succes: modification ? 'Achat enregistré avec succès.' : 'Achat enregistré avec succès : le stock a augmenté.' },
    )
    if (ok) onEnregistre(ok)
  }

  return (
    <Modal
      ouvert
      panneau
      titre={modification ? "Modifier l'achat" : 'Enregistrer un achat de pièce'}
      sousTitre="Un achat augmente le stock de la pièce."
      icone={ShoppingCart}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-achat" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-achat" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        <FormField label="Pièce" htmlFor="reference_piece" required error={errors.reference_piece}>
          <Controller
            name="reference_piece"
            control={control}
            rules={{ required: 'Choisissez une pièce.' }}
            render={({ field }) => (
              <Selecteur
                id="reference_piece"
                desactive={modification}
                options={(donnees.pieces || []).map((p) => ({ valeur: p.reference, libelle: p.libelle, detail: p.reference }))}
                valeur={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalide={Boolean(errors.reference_piece)}
                placeholder="Rechercher une pièce"
              />
            )}
          />
        </FormField>
        <FormField label="Fournisseur" htmlFor="code_fournisseur" required error={errors.code_fournisseur}>
          <Controller
            name="code_fournisseur"
            control={control}
            rules={{ required: 'Choisissez un fournisseur.' }}
            render={({ field }) => (
              <Selecteur
                id="code_fournisseur"
                desactive={modification}
                options={(donnees.fournisseurs || []).map((f) => ({ valeur: f.code_fournisseur, libelle: f.raison_sociale, detail: f.code_fournisseur }))}
                valeur={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalide={Boolean(errors.code_fournisseur)}
                placeholder="Rechercher un fournisseur"
              />
            )}
          />
        </FormField>
        <FormField label="Date d'achat" htmlFor="date_achat" required error={errors.date_achat}>
          <input
            id="date_achat"
            type="date"
            className={`input ${errors.date_achat ? 'invalid' : ''}`}
            disabled={modification}
            {...register('date_achat', { required: "La date d'achat est obligatoire." })}
          />
        </FormField>
        <FormField label="Prix d'achat unitaire (FCFA)" htmlFor="prix_achat" required error={errors.prix_achat}>
          <input
            id="prix_achat"
            type="number"
            min="0"
            step="any"
            className={`input ${errors.prix_achat ? 'invalid' : ''}`}
            {...register('prix_achat', regleNombre({ min: 0, entier: false, libelle: 'Le prix', message: 'Le prix ne peut pas être négatif.' }))}
          />
        </FormField>
        <FormField label="Quantité" htmlFor="quantite" required error={errors.quantite}>
          <input
            id="quantite"
            type="number"
            min="1"
            className={`input ${errors.quantite ? 'invalid' : ''}`}
            {...register('quantite', regleNombre({ minExclusif: 0, libelle: 'La quantité', message: 'La quantité doit être supérieure à 0.' }))}
          />
        </FormField>
      </form>
    </Modal>
  )
}

export default function Pieces() {
  const navigate = useNavigate()
  const droits = useDroits('pieces')
  const droitsAchats = useDroits('achats')
  const { donnees, chargement, erreur, recharger } = useApi({ pieces: '/pieces' })
  const [stockFaible, setStockFaible] = useState(false)
  const [edition, setEdition] = useEdition(droits.creer)
  const [achat, setAchat] = useEdition(droitsAchats.creer, 'achat')
  const suppression = useSuppression(recharger)
  const pieces = (donnees.pieces || []).filter((p) => !stockFaible || p.quantite_stock <= SEUIL_STOCK_PIECE)
  const voir = (p) => navigate(`/pieces/${encodeURIComponent(p.reference)}`)

  const colonnes = [
    { cle: 'reference', libelle: 'Référence', rendu: (p) => <span className="chip">{p.reference}</span> },
    { cle: 'libelle', libelle: 'Libellé', rendu: (p) => <strong>{p.libelle}</strong> },
    { cle: 'prix_unitaire_ht', libelle: 'Prix HT (FCFA)', align: 'right', rendu: (p) => formatFCFA(p.prix_unitaire_ht) },
    { cle: 'quantite_stock', libelle: 'Stock', align: 'right', rendu: (p) => <BadgeStockPiece stock={p.quantite_stock} /> },
    { cle: 'nb_composants', libelle: 'Composée de', align: 'right', rendu: (p) => (p.nb_composants ? `${p.nb_composants} pièce(s)` : '-') },
  ]

  return (
    <>
      <PageHeader titre="Pièces et stock" icone={Warehouse} sousTitre="Pièces détachées, nomenclature et achats auprès des fournisseurs.">
        {droitsAchats.creer && (
          <button type="button" className="btn btn-secondary" onClick={() => setAchat({})}>
            <ShoppingCart size={18} /> Enregistrer un achat
          </button>
        )}
        {droits.creer && (
          <button type="button" className="btn btn-primary" onClick={() => setEdition({})}>
            <Plus size={18} /> Ajouter
          </button>
        )}
      </PageHeader>
      {droits.lectureSeule && droitsAchats.lectureSeule && <LectureSeule />}

      {erreur ? (
        <Erreur message={erreur} />
      ) : (
        <DataTable
          columns={colonnes}
          rows={pieces}
          rowKey={(p) => p.reference}
          chargement={chargement}
          onRowClick={voir}
          rechercheTexte="Rechercher une référence ou un libellé"
          vide="Aucune pièce enregistrée pour le moment."
          videIcone={Warehouse}
          videAction={
            droits.creer && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdition({})}>
                <Plus size={18} /> Ajouter la première pièce
              </button>
            )
          }
          filtres={
            <label className="row" style={{ gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={stockFaible} onChange={(e) => setStockFaible(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
              Stock faible seulement ({SEUIL_STOCK_PIECE} ou moins)
            </label>
          }
          actions={(p) => (
            <Actions
              voir={() => voir(p)}
              modifier={droits.modifier && (() => setEdition({ piece: p }))}
              supprimer={
                droits.supprimer &&
                (() => suppression.demander(`/pieces/${encodeURIComponent(p.reference)}`, `Supprimer la pièce ${p.libelle} ?`, 'Pièce supprimée avec succès.'))
              }
            />
          )}
        />
      )}

      {edition && (
        <FormulairePiece
          piece={edition.piece}
          onFermer={() => setEdition(null)}
          onEnregistre={() => {
            setEdition(null)
            recharger()
          }}
        />
      )}
      {achat && (
        <FormulaireAchat
          onFermer={() => setAchat(null)}
          onEnregistre={() => {
            setAchat(null)
            recharger()
          }}
        />
      )}
      <ConfirmDialog {...suppression.dialogue} />
    </>
  )
}
