import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Info, Pencil, ShoppingCart, Trash2, Truck, Warehouse } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useSuppression } from '../hooks/useSuppression'
import { formatDate, formatFCFA } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Onglets from '../components/Onglets'
import ConfirmDialog from '../components/ConfirmDialog'
import { Chargement, Erreur, LectureSeule } from '../components/Etats'
import { FormulaireFournisseur } from './Fournisseurs'

export default function FournisseurDetail() {
  const { code } = useParams()
  const navigate = useNavigate()
  const droits = useDroits('fournisseurs')
  const cle = encodeURIComponent(code)
  const { donnees, chargement, erreur, recharger } = useApi({ fournisseur: `/fournisseurs/${cle}` })
  const [onglet, setOnglet] = useState('infos')
  const [edition, setEdition] = useState(false)
  const suppression = useSuppression(() => navigate('/fournisseurs'))
  const f = donnees.fournisseur

  if (chargement) return <Chargement />
  if (erreur) return <Erreur message={erreur} />

  return (
    <>
      <PageHeader
        titre={f.raison_sociale}
        sousTitre={
          <span className="row" style={{ flexWrap: 'wrap' }}>
            <span className="chip">{f.code_fournisseur}</span>
            <span className="badge badge-primary">{f.nb_pieces} pièce(s) fournie(s)</span>
          </span>
        }
        retour={{ chemin: '/fournisseurs', libelle: 'Fournisseurs' }}
        icone={Truck}
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
            onClick={() => suppression.demander(`/fournisseurs/${cle}`, `Supprimer le fournisseur ${f.raison_sociale} ?`, 'Fournisseur supprimé avec succès.')}
          >
            <Trash2 size={18} /> Supprimer
          </button>
        )}
      </PageHeader>
      {droits.lectureSeule && <LectureSeule />}

      <Onglets
        onglets={[
          { cle: 'infos', libelle: 'Informations', icone: Info },
          { cle: 'pieces', libelle: 'Pièces fournies', icone: Warehouse, nombre: f.pieces.length },
          { cle: 'achats', libelle: 'Achats', icone: ShoppingCart, nombre: f.achats.length },
        ]}
        actif={onglet}
        onChange={setOnglet}
      />

      {onglet === 'infos' && (
        <section className="panel panel-body">
          <dl className="details">
            <dt>Code</dt>
            <dd>{f.code_fournisseur}</dd>
            <dt>Raison sociale</dt>
            <dd>{f.raison_sociale}</dd>
            <dt>Adresse</dt>
            <dd>{f.adresse || '-'}</dd>
            <dt>Téléphone</dt>
            <dd>{f.telephone || '-'}</dd>
            <dt>Montant total des achats</dt>
            <dd>{formatFCFA(f.achats.reduce((s, a) => s + a.montant, 0))}</dd>
          </dl>
        </section>
      )}
      {onglet === 'pieces' && (
        <DataTable
          columns={[
            { cle: 'reference_piece', libelle: 'Référence', rendu: (p) => <span className="chip">{p.reference_piece}</span> },
            { cle: 'libelle', libelle: 'Pièce', rendu: (p) => <strong>{p.libelle}</strong> },
            { cle: 'nb_achats', libelle: 'Achats', align: 'right' },
            { cle: 'quantite_totale', libelle: 'Quantité totale', align: 'right' },
            { cle: 'dernier_prix', libelle: 'Dernier prix', align: 'right', rendu: (p) => formatFCFA(p.dernier_prix) },
            { cle: 'derniere_date', libelle: 'Dernier achat', rendu: (p) => formatDate(p.derniere_date) },
          ]}
          rows={f.pieces}
          rowKey={(p) => p.reference_piece}
          recherche={false}
          onRowClick={(p) => navigate(`/pieces/${encodeURIComponent(p.reference_piece)}`)}
          vide="Aucune pièce achetée chez ce fournisseur."
          videIcone={Warehouse}
        />
      )}
      {onglet === 'achats' && (
        <DataTable
          columns={[
            { cle: 'date_achat', libelle: 'Date', rendu: (a) => formatDate(a.date_achat) },
            { cle: 'libelle_piece', libelle: 'Pièce' },
            { cle: 'prix_achat', libelle: "Prix d'achat", align: 'right', rendu: (a) => formatFCFA(a.prix_achat) },
            { cle: 'quantite', libelle: 'Quantité', align: 'right' },
            { cle: 'montant', libelle: 'Montant', align: 'right', rendu: (a) => formatFCFA(a.montant) },
          ]}
          rows={f.achats}
          rowKey={(a) => `${a.reference_piece}-${a.date_achat}`}
          recherche={false}
          vide="Aucun achat chez ce fournisseur."
          videIcone={ShoppingCart}
        />
      )}

      {edition && (
        <FormulaireFournisseur
          fournisseur={f}
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
