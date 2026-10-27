import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Package, Plus } from 'lucide-react'
import api from '../api/client'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useEdition } from '../hooks/useEdition'
import { useSuppression } from '../hooks/useSuppression'
import { regleNombre, regleTexte, useSoumission } from '../hooks/useSoumission'
import { formatFCFA, formatNombre } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal, { PiedFormulaire } from '../components/Modal'
import FormField from '../components/FormField'
import ConfirmDialog from '../components/ConfirmDialog'
import Actions from '../components/Actions'
import { Erreur, LectureSeule } from '../components/Etats'

export const SEUIL_STOCK_PRODUIT = 100

export function BadgeStockProduit({ stock }) {
  return (
    <span className={`badge ${stock <= SEUIL_STOCK_PRODUIT ? 'badge-danger' : 'badge-success'}`}>
      {formatNombre(stock)}
    </span>
  )
}

export function FormulaireProduit({ produit, onFermer, onEnregistre }) {
  const modification = Boolean(produit)
  const { erreurGlobale, executer } = useSoumission()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onTouched',
    defaultValues: produit || { reference: '', designation: '', prix_vente_unitaire: '', quantite_stock: 0 },
  })

  const soumettre = async (v) => {
    const corps = { designation: v.designation, prix_vente_unitaire: v.prix_vente_unitaire, quantite_stock: v.quantite_stock }
    const ok = await executer(
      () =>
        modification
          ? api.put(`/produits/${encodeURIComponent(produit.reference)}`, corps)
          : api.post('/produits', { ...corps, reference: v.reference }),
      { setError, succes: 'Produit enregistré avec succès.' },
    )
    if (ok) onEnregistre(ok)
  }

  return (
    <Modal
      ouvert
      panneau
      titre={modification ? `Modifier le produit ${produit.reference}` : 'Nouveau produit'}
      sousTitre="Le prix et le stock ne peuvent pas être négatifs."
      icone={Package}
      onFermer={onFermer}
      pied={<PiedFormulaire formulaire="form-produit" enCours={isSubmitting} onAnnuler={onFermer} />}
    >
      <form id="form-produit" className="form-grid" onSubmit={handleSubmit(soumettre)} noValidate>
        {erreurGlobale && (
          <div className="full">
            <Erreur message={erreurGlobale} />
          </div>
        )}
        <FormField label="Référence" htmlFor="reference" required error={errors.reference} hint="Exemple : PRD-ATT1K">
          <input
            id="reference"
            className={`input mono ${errors.reference ? 'invalid' : ''}`}
            disabled={modification}
            {...register('reference', modification ? {} : regleTexte('La référence', 20))}
          />
        </FormField>
        <FormField label="Désignation" htmlFor="designation" required error={errors.designation}>
          <input id="designation" className={`input ${errors.designation ? 'invalid' : ''}`} {...register('designation', regleTexte('La désignation', 100))} />
        </FormField>
        <FormField label="Prix de vente unitaire (FCFA)" htmlFor="prix" required error={errors.prix_vente_unitaire}>
          <input
            id="prix"
            type="number"
            min="0"
            step="any"
            className={`input ${errors.prix_vente_unitaire ? 'invalid' : ''}`}
            {...register(
              'prix_vente_unitaire',
              regleNombre({ min: 0, entier: false, libelle: 'Le prix', message: 'Le prix ne peut pas être négatif.' }),
            )}
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

export default function Produits() {
  const navigate = useNavigate()
  const droits = useDroits('produits')
  const { donnees, chargement, erreur, recharger } = useApi({ produits: '/produits' })
  const [edition, setEdition] = useEdition(droits.creer)
  const suppression = useSuppression(recharger)
  const voir = (p) => navigate(`/produits/${encodeURIComponent(p.reference)}`)

  const colonnes = [
    { cle: 'reference', libelle: 'Référence', rendu: (p) => <span className="chip">{p.reference}</span> },
    { cle: 'designation', libelle: 'Désignation', rendu: (p) => <strong>{p.designation}</strong> },
    { cle: 'prix_vente_unitaire', libelle: 'Prix de vente (FCFA)', align: 'right', rendu: (p) => formatFCFA(p.prix_vente_unitaire) },
    { cle: 'quantite_stock', libelle: 'Stock', align: 'right', rendu: (p) => <BadgeStockProduit stock={p.quantite_stock} /> },
  ]

  return (
    <>
      <PageHeader titre="Produits" icone={Package} sousTitre="Produits fabriqués par l'usine, avec leur prix de vente et leur stock.">
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
          rows={donnees.produits || []}
          rowKey={(p) => p.reference}
          chargement={chargement}
          onRowClick={voir}
          rechercheTexte="Rechercher une référence ou une désignation"
          vide="Aucun produit enregistré pour le moment."
          videIcone={Package}
          videAction={
            droits.creer && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdition({})}>
                <Plus size={18} /> Ajouter le premier produit
              </button>
            )
          }
          actions={(p) => (
            <Actions
              voir={() => voir(p)}
              modifier={droits.modifier && (() => setEdition({ produit: p }))}
              supprimer={
                droits.supprimer &&
                (() =>
                  suppression.demander(
                    `/produits/${encodeURIComponent(p.reference)}`,
                    `Supprimer le produit ${p.designation} ?`,
                    'Produit supprimé avec succès.',
                  ))
              }
            />
          )}
        />
      )}

      {edition && (
        <FormulaireProduit
          produit={edition.produit}
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
