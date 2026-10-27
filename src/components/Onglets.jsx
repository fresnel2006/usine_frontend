/** Onglets des fiches détail : onglets = [{ cle, libelle, icone?, nombre? }] */
export default function Onglets({ onglets, actif, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {onglets.map(({ cle, libelle, icone: Icone, nombre }) => (
        <button
          key={cle}
          type="button"
          role="tab"
          aria-selected={actif === cle}
          className={`tab ${actif === cle ? 'active' : ''}`}
          onClick={() => onChange(cle)}
        >
          {Icone && <Icone size={18} />}
          {libelle}
          {nombre !== undefined && <span className="badge sans-point">{nombre}</span>}
        </button>
      ))}
    </div>
  )
}
