import { describe, expect, it } from 'vitest'
import { pageFromPath, pathForPage, type Page } from './routes'

describe('lib/routes', () => {
  it('pathForPage returns the canonical URL for each page', () => {
    expect(pathForPage('inicio')).toBe('/')
    expect(pathForPage('catalogo')).toBe('/catalogo')
    expect(pathForPage('admin_dash')).toBe('/admin')
    expect(pathForPage('admin_users')).toBe('/admin/usuarios')
  })

  it('pageFromPath is the inverse', () => {
    expect(pageFromPath('/')).toBe('inicio')
    expect(pageFromPath('/catalogo')).toBe('catalogo')
    expect(pageFromPath('/admin')).toBe('admin_dash')
    expect(pageFromPath('/admin/integracoes')).toBe('admin_integrations')
  })

  it('pageFromPath strips trailing slash', () => {
    expect(pageFromPath('/catalogo/')).toBe('catalogo')
  })

  it('pageFromPath defaults unknown paths to inicio', () => {
    expect(pageFromPath('/nope')).toBe('inicio')
    expect(pageFromPath('/admin/banana')).toBe('inicio')
  })

  it('round-trips every Page value', () => {
    const pages: Page[] = [
      'inicio', 'catalogo', 'pedidos', 'desafios', 'perfil',
      'admin_dash', 'admin_users', 'admin_products', 'admin_banners', 'admin_orders',
      'admin_company', 'admin_logs', 'admin_stock', 'admin_images', 'admin_integrations',
    ]
    for (const p of pages) {
      expect(pageFromPath(pathForPage(p))).toBe(p)
    }
  })
})
