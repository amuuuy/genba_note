import type { DocumentTemplateId } from '@/types/settings';
import type { DocumentType } from '@/types/document';

export interface TemplateOption {
  value: DocumentTemplateId;
  label: string;
  description: string;
}

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    value: 'FORMAL_STANDARD',
    label: 'フォーマル',
    description: '正統派ビジネス文書（2カラムヘッダー・点線区切り合計）',
  },
  {
    value: 'ACCOUNTING',
    label: '会計帳票型',
    description: '黒背景ラベル・合計大枠・税率別内訳',
  },
  {
    value: 'SIMPLE',
    label: 'シンプル',
    description: 'ミニマルデザイン（小さい印鑑・控えめな備考欄）',
  },
  {
    value: 'MODERN',
    label: 'モダン',
    description: 'アクセントカラー・カード型合計・余白重視',
  },
  {
    value: 'CLASSIC',
    label: '和風クラシック',
    description: '明朝体・二重罫線・格子テーブル・御見積書',
  },
  {
    value: 'CONSTRUCTION',
    label: '建設業向け',
    description: '4カラムテーブル・御見積金額表示・透かし背景対応',
  },
];

/**
 * Resolve a template ID for the given document type.
 * Post-M1: all templates are available to all users, so this is effectively
 * an identity function kept for call-site clarity.
 */
export function resolveTemplateForUser(
  _docType: DocumentType,
  templateId: DocumentTemplateId
): DocumentTemplateId {
  return templateId;
}

/**
 * Get all selectable template options.
 */
export function getSelectableTemplateOptions(): TemplateOption[] {
  return TEMPLATE_OPTIONS;
}
