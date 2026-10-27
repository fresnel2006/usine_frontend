import { LIBELLES_ROLES } from '../utils/permissions'

/** Badge du rôle (teintes de bleu et de gris uniquement). */
export default function BadgeRole({ role }) {
  return <span className={`badge sans-point badge-role-${String(role).toLowerCase()}`}>{LIBELLES_ROLES[role] || role}</span>
}
