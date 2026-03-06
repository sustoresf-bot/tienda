import fs from 'fs/promises';
import path from 'path';
import { getSettingsConfig, getStoreIdFromRequest } from '../lib/authz.js';

const templateCandidates = [
    path.join(process.cwd(), 'public', 'index.html'),
    path.join(process.cwd(), 'index.html')
];

let cachedTemplate = null;

async function loadTemplate() {
    if (cachedTemplate) return cachedTemplate;
    for (const candidate of templateCandidates) {
        try {
            const content = await fs.readFile(candidate, 'utf8');
            if (content && content.includes('<html')) {
                cachedTemplate = content;
                return cachedTemplate;
            }
        } catch { }
    }
    throw new Error('No se pudo cargar index.html');
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function replaceTagAttrById(html, id, attr, value) {
    const regex = new RegExp(`(<[^>]+id=["']${id}["'][^>]*\\b${attr}=["'])[^"']*(["'][^>]*>)`, 'i');
    return html.replace(regex, `$1${escapeHtml(value)}$2`);
}

function replaceTitle(html, value) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(value)}</title>`);
}

function getRequestOrigin(req) {
    const host = String(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').trim();
    const proto = String(req?.headers?.['x-forwarded-proto'] || 'https').trim();
    if (!host) return '';
    return `${proto}://${host}`;
}

function normalizeBaseUrl(rawValue, fallbackOrigin) {
    const input = String(rawValue || '').trim();
    const fallback = String(fallbackOrigin || '').trim();
    const candidate = input || fallback;
    if (!candidate) return '';
    try {
        const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
        const parsed = new URL(withProtocol);
        return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
    } catch {
        return fallback.replace(/\/+$/, '');
    }
}

function applySeoToTemplate(template, seo) {
    let html = template;
    html = replaceTitle(html, seo.title);
    html = replaceTagAttrById(html, 'meta-description', 'content', seo.description);
    html = replaceTagAttrById(html, 'meta-keywords', 'content', seo.keywords);
    html = replaceTagAttrById(html, 'meta-author', 'content', seo.author);
    html = replaceTagAttrById(html, 'meta-apple-title', 'content', seo.appleTitle);
    html = replaceTagAttrById(html, 'meta-theme-color', 'content', seo.themeColor);
    html = replaceTagAttrById(html, 'og-url', 'content', seo.url);
    html = replaceTagAttrById(html, 'og-title', 'content', seo.title);
    html = replaceTagAttrById(html, 'og-description', 'content', seo.description);
    html = replaceTagAttrById(html, 'og-site-name', 'content', seo.siteName);
    html = replaceTagAttrById(html, 'og-image', 'content', seo.image);
    html = replaceTagAttrById(html, 'twitter-url', 'content', seo.url);
    html = replaceTagAttrById(html, 'twitter-title', 'content', seo.title);
    html = replaceTagAttrById(html, 'twitter-description', 'content', seo.description);
    html = replaceTagAttrById(html, 'twitter-image', 'content', seo.image);
    html = html.replace(/(<link[^>]+id=["']link-canonical["'][^>]*href=["'])[^"']*(["'][^>]*>)/i, `$1${escapeHtml(seo.url)}$2`);
    return html;
}

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const template = await loadTemplate();
        const storeId = getStoreIdFromRequest(req);
        const settings = (await getSettingsConfig(storeId)) || {};
        const fallbackOrigin = getRequestOrigin(req);
        const fallbackSiteUrl = process.env.PUBLIC_SITE_URL || fallbackOrigin;
        const siteUrl = normalizeBaseUrl(settings.seoUrl, fallbackSiteUrl);
        const storeName = String(settings.storeName || 'Tienda Online').trim() || 'Tienda Online';
        const title = String(settings.seoTitle || `${storeName} - Tienda Online`).trim() || 'Tienda Online';
        const description = String(settings.seoDescription || `${storeName} - Tu tienda online de confianza.`).trim() || 'Tienda Online';
        const keywords = String(settings.seoKeywords || `${storeName}, productos, comprar, envíos`).trim();
        const author = String(settings.seoAuthor || storeName).trim();
        const image = String(settings.seoImage || settings.logoUrl || settings.heroUrl || '').trim();
        const themeColor = String(settings.primaryColor || '#f97316').trim();

        const finalHtml = applySeoToTemplate(template, {
            title,
            description,
            keywords,
            author,
            appleTitle: storeName,
            themeColor,
            url: siteUrl,
            siteName: storeName,
            image
        });

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=600');
        res.setHeader('Vary', 'Host, X-Forwarded-Host');
        return res.status(200).send(finalHtml);
    } catch (error) {
        console.error('SEO render error:', error);
        return res.status(500).json({ error: 'No se pudo renderizar SEO' });
    }
}
