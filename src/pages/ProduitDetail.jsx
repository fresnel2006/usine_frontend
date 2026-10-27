import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Boxes, Info, Package, Pencil, Trash2 } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useDroits } from '../hooks/useCan'
import { useSuppression } from '../hooks/useSuppression'
import { formatDate, formatFCFA, formatNombre } from '../utils/format'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Onglets from '../components/Onglets'
import ConfirmDialog from '../components/ConfirmDialog'
import { Chargement, Erreur, LectureSeule } from '../components/Etats'
import { BadgeStockProduit, FormulaireProduit, SEUIL_STOCK_PRODUIT } from './Produits'

export default function ProduitDetail() {
  const { ref } = useParams()
  const navigate = useNavigate()
  const droits = useDroits('produits')
  const code = encodeURIComponent(ref)
  const { donnees, chargement, erreur, recharger } = useApi({ produit: `/produits/${code}`, lots: `/lots?produit=${code}` })
  const [onglet, setOnglet] = useState('infos')
  const [edition, setEdition] = useState(false)
  const suppression = useSuppression(() => navigate('/produits'))
  const produit = donnees.produit

  if (chargement) return <Chargement />
  if (erreur) return <Erreur message={erreur} />

  return (
    <>
      <PageHeader
        titre={produit.designation}
        sousTitre={
          <span className="row" style={{ flexWrap: 'wrap' }}>
            <span className="chip">{produit.reference}</span>
            <BadgeStockProduit stock={produit.quantite_stock} />
          </span>
        }
        retour={{ chemin: '/produits', libelle: 'Produits' }}
        icone={Package}
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
            onClick={() => suppression.demander(`/produits/${code}`, `Supprimer le produit ${produit.designation} ?`, 'Produit supprimé avec succès.')}
          >
            <Trash2 size={18} /> Supprimer
          </button>
        )}
      </PageHeader>
      {droits.lectureSeule && <LectureSeule />}

      <Onglets
        onglets={[
          { cle: 'infos', libelle: 'Informations', icone: Info },
          { cle: 'lots', libelle: 'Lots produits', icone: Boxes, nombre: donnees.lots.length },
        ]}
        actif={onglet}
        onChange={setOnglet}
      />

      {onglet === 'infos' ? (
        <section className="panel panel-body">
          <dl className="details">
            <dt>Référence</dt>
            <dd>{produit.reference}</dd>
            <dt>Désignation</dt>
            <dd>{produit.designation}</dd>
            <dt>Prix de vente unitaire</dt>
            <dd>{formatFCFA(produit.prix_vente_unitaire)}</dd>
            <dt>Quantité en stock</dt>
            <dd>
              {formatNombre(produit.quantite_stock)}
              {produit.quantite_stock <= SEUIL_STOCK_PRODUIT && <span className="muted small"> - stock faible ({SEUIL_STOCK_PRODUIT} ou moins)</span>}
            </dd>
            <dt>Valeur du stock</dt>
            <dd>{formatFCFA(produit.prix_vente_unitaire * produit.quantite_stock)}</dd>
          </dl>
        </section>
      ) : (
        <DataTable
          columns={[
            { cle: 'num_lot', libelle: 'N° lot', largeur: 120, rendu: (l) => <span className="chip">{l.num_lot}</span> },
            { cle: 'date_production', libelle: 'Date', rendu: (l) => formatDate(l.date_production) },
            { cle: 'num_ligne', libelle: 'Ligne', rendu: (l) => `Ligne ${l.num_ligne} - ${l.atelier_libelle}` },
          ]}
          rows={donnees.lots}
          rowKey={(l) => l.num_lot}
          recherche={false}
          onRowClick={(l) => navigate(`/lots/${l.num_lot}`)}
          vide="Aucun lot de ce produit."
          videIcone={Boxes}
        />
      )}

      {edition && (
        <FormulaireProduit
          produit={produit}
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
