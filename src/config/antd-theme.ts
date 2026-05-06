import type { ThemeConfig } from 'antd';

/**
 * Tema Ant Design — Rojo oscuro + Blanco
 * Paleta: Crimson #991B1B como primario
 */
export const ANTD_THEME: ThemeConfig = {
  token: {
    colorPrimary:        '#991B1B',
    colorPrimaryHover:   '#7F1D1D',
    colorPrimaryActive:  '#6B1111',
    colorLink:           '#991B1B',
    colorLinkHover:      '#7F1D1D',
    borderRadius:        8,
    borderRadiusLG:      10,
    borderRadiusSM:      6,
    fontFamily:          "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontSize:            14,
    colorBgContainer:    '#ffffff',
    colorBgLayout:       '#fafafa',
    colorBorder:         '#e5e7eb',
    colorTextBase:       '#111827',
    boxShadow:           '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
    boxShadowSecondary:  '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  },
  components: {
    Layout: {
      siderBg:       '#1C0808',
      triggerBg:     '#2D0F0F',
      triggerColor:  '#f9fafb',
    },
    Menu: {
      darkItemBg:            '#1C0808',
      darkSubMenuItemBg:     '#2D0F0F',
      darkItemColor:         '#d1d5db',
      darkItemHoverColor:    '#ffffff',
      darkItemSelectedColor: '#ffffff',
      darkItemSelectedBg:    '#991B1B',
      darkItemHoverBg:       '#3D1515',
    },
    Card: {
      headerBg:       'transparent',
      boxShadow:      '0 1px 3px rgba(0,0,0,0.08)',
    },
    Button: {
      borderRadius:   8,
      fontWeight:     600,
    },
    Input: {
      borderRadius:   8,
    },
    InputNumber: {
      borderRadius:   8,
    },
    Table: {
      headerBg:       '#FEF2F2',
      headerColor:    '#7F1D1D',
      rowHoverBg:     '#FFF5F5',
      borderColor:    '#fecaca',
    },
    Tabs: {
      inkBarColor:    '#991B1B',
      itemSelectedColor: '#991B1B',
      itemHoverColor: '#7F1D1D',
    },
    Statistic: {
      titleFontSize:  13,
    },
    Tag: {
      borderRadiusSM: 6,
    },
  },
};

/** Color primario para uso directo en estilos inline */
export const COLOR_PRIMARY   = '#991B1B';
export const COLOR_PRIMARY_DARK = '#7F1D1D';
export const COLOR_PRIMARY_LIGHT = '#FEF2F2';
export const COLOR_SIDEBAR_BG = '#1C0808';
export const COLOR_SUCCESS   = '#15803D';
export const COLOR_DANGER    = '#DC2626';
export const COLOR_WARNING   = '#B45309';
