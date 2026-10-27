export default function FormField({ label, htmlFor, error, hint, required, className = '', children }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label htmlFor={htmlFor}>
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {children}
      {error ? <span className="field-error">{error.message || error}</span> : hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}
