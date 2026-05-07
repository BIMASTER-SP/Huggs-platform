/**
 * URL ↔ Page mapping.
 *
 * The internal `Page` discriminator (legacy from the state-machine days)
 * is now derived from the URL via `pageFromPath()` and projected back
 * via `pathForPage()`. Components that used to call `setPage('catalogo')`
 * now call `navigate(pathForPage('catalogo'))` and read `current` from
 * `useLocation()`.
 *
 * This keeps the component prop contracts unchanged while restoring real
 * URLs (deep-link, browser back/forward, refresh-safe).
 */

export type Page =
  | 'inicio' | 'catalogo' | 'pedidos' | 'desafios' | 'perfil'
  | 'admin_dash' | 'admin_users' | 'admin_products' | 'admin_banners' | 'admin_orders'
  | 'admin_company' | 'admin_logs' | 'admin_stock' | 'admin_images' | 'admin_integrations'

const PAGE_TO_PATH: Record<Page, string> = {
  inicio: '/',
  catalogo: '/catalogo',
  pedidos: '/pedidos',
  desafios: '/desafios',
  perfil: '/perfil',
  admin_dash: '/admin',
  admin_users: '/admin/usuarios',
  admin_products: '/admin/produtos',
  admin_banners: '/admin/banners',
  admin_orders: '/admin/pedidos',
  admin_company: '/admin/empresa',
  admin_logs: '/admin/logs',
  admin_stock: '/admin/estoque',
  admin_images: '/admin/imagens',
  admin_integrations: '/admin/integracoes',
}

const PATH_TO_PAGE: Record<string, Page> = Object.fromEntries(
  (Object.entries(PAGE_TO_PATH) as [Page, string][]).map(([page, path]) => [path, page]),
) as Record<string, Page>

export function pathForPage(page: Page): string {
  return PAGE_TO_PATH[page] ?? '/'
}

export function pageFromPath(pathname: string): Page {
  // Normalize trailing slash (except root).
  const normalized = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  return PATH_TO_PAGE[normalized] ?? 'inicio'
}
