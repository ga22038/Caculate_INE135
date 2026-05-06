import type { ThemeConfig } from 'antd';

/**
 * Tema — Universidad Nacional de El Salvador (UES)
 * Paleta: Rojo vino #8B0D14 + Blanco. Sin oscuros ni degradados.
 */
export const ANTD_THEME: ThemeConfig = {
  token: {
    colorPrimary:        '#8B0D14',
    colorPrimaryHover:   '#6E0A10',
    colorPrimaryActive:  '#56080C',
    colorLink:           '#8B0D14',
    colorLinkHover:      '#6E0A10',
    borderRadius:        8,
    borderRadiusLG:      10,
    borderRadiusSM:      6,
    fontFamily:          "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontSize:            14,
    colorBgContainer:    '#ffffff',
    colorBgLayout:       '#f5f5f5',
    colorBorder:         '#e5e7eb',
    colorTextBase:       '#111827',
    boxShadow:           '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
    boxShadowSecondary:  '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  },
  components: {
    Layout: {
      siderBg:       '#ffffff',
      triggerBg:     '#f3f4f6',
      triggerColor:  '#374151',
    },
    Menu: {
      itemBg:               '#ffffff',
      subMenuItemBg:        '#ffffff',
      itemColor:            '#374151',
      itemHoverColor:       '#8B0D14',
      itemSelectedColor:    '#8B0D14',
      itemSelectedBg:       '#FDF2F3',
      itemHoverBg:          '#FDF2F3',
      itemActiveBg:         '#FDE8EA',
    },
    Card: {
      headerBg:  'transparent',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    },
    Button: {
      borderRadius: 8,
      fontWeight:   600,
    },
    Input: {
      borderRadius: 8,
    },
    InputNumber: {
      borderRadius: 8,
    },
    Table: {
      headerBg:    '#FDF2F3',
      headerColor: '#6E0A10',
      rowHoverBg:  '#FFF5F6',
      borderColor: '#fecaca',
    },
    Tabs: {
      inkBarColor:       '#8B0D14',
      itemSelectedColor: '#8B0D14',
      itemHoverColor:    '#6E0A10',
    },
    Statistic: {
      titleFontSize: 13,
    },
    Tag: {
      borderRadiusSM: 6,
    },
  },
};

/** Colores UES para uso directo en estilos inline */
export const COLOR_PRIMARY        = '#8B0D14';
export const COLOR_PRIMARY_DARK   = '#6E0A10';
export const COLOR_PRIMARY_LIGHT  = '#FDF2F3';
export const COLOR_SIDEBAR_BG     = '#ffffff';
export const COLOR_SUCCESS        = '#15803D';
export const COLOR_DANGER         = '#DC2626';
export const COLOR_WARNING        = '#B45309';
