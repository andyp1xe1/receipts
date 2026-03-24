export interface ExportFilters {
  month?: string | null;
  category?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number | null;
  pdfMode?: 'compact' | 'full';
}

export function readExportFilters(url: URL): ExportFilters {
  const limitParam = url.searchParams.get('limit');
  const parsedLimit = limitParam && limitParam !== 'all' ? Number.parseInt(limitParam, 10) : null;
  const pdfModeParam = url.searchParams.get('pdf_mode');

  return {
    month: emptyToNull(url.searchParams.get('month')),
    category: emptyToNull(url.searchParams.get('category')),
    from: emptyToNull(url.searchParams.get('from')),
    to: emptyToNull(url.searchParams.get('to')),
    limit: Number.isFinite(parsedLimit) && parsedLimit && parsedLimit > 0 ? parsedLimit : null,
    pdfMode: pdfModeParam === 'full' ? 'full' : 'compact'
  };
}

function emptyToNull(value: string | null): string | null {
  return value && value.trim() ? value : null;
}
