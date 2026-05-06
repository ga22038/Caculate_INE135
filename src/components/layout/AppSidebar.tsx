'use client';

import { useState } from 'react';
import { Layout, Menu, Typography } from 'antd';
import {
  FundOutlined,
  CalculatorOutlined,
  LineChartOutlined,
  RiseOutlined,
  SwapOutlined,
  TableOutlined,
  BookOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';

const { Sider, Content } = Layout;
const { Text } = Typography;

const NAV_ITEMS = [
  { key: '/',         icon: <FundOutlined />,       label: 'Dashboard' },
  { key: '/vpn',      icon: <CalculatorOutlined />,  label: 'VPN — Valor Presente Neto' },
  { key: '/cae',      icon: <LineChartOutlined />,   label: 'CAE — Costo Anual Equiv.' },
  { key: '/tir',      icon: <RiseOutlined />,        label: 'TIR — Tasa Interna Retorno' },
  { key: '/comparar', icon: <SwapOutlined />,        label: 'Comparar Alternativas' },
  { key: '/tablas',   icon: <TableOutlined />,       label: 'Tablas de Factores' },
  { key: '/guia',     icon: <BookOutlined />,        label: 'Guía Teórica' },
];

export default function AppSidebar({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname  = usePathname();
  const router    = useRouter();

  const selectedKey = NAV_ITEMS.find(item =>
    item.key !== '/' ? pathname.startsWith(item.key) : pathname === '/'
  )?.key ?? '/';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        className="seae-sidebar"
        collapsed={collapsed}
        collapsible
        trigger={null}
        width={240}
        collapsedWidth={64}
        style={{ position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100, overflow: 'hidden' }}
      >
        {/* Logo */}
        {!collapsed ? (
          <div className="seae-logo">
            <div className="seae-logo-title">SEAE</div>
            <div className="seae-logo-sub">Ingeniería de Negocios • INE135</div>
          </div>
        ) : (
          <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: '#991B1B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 16,
            }}>S</div>
          </div>
        )}

        {/* Menú */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={NAV_ITEMS.map(item => ({ ...item, style: { borderRadius: 6, margin: '2px 8px' } }))}
          onClick={({ key }) => router.push(key)}
          style={{ background: 'transparent', border: 'none', flex: 1, padding: '8px 0' }}
        />

        {/* Toggle */}
        <button
          onClick={() => setCollapsed(p => !p)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', padding: '12px 0',
            background: 'transparent', border: 'none',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            color: '#9ca3af', cursor: 'pointer', fontSize: 13, gap: 6,
            transition: 'color 0.15s',
          }}
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? <MenuUnfoldOutlined /> : (
            <>
              <MenuFoldOutlined />
              <Text style={{ color: '#9ca3af', fontSize: 11 }}>Colapsar</Text>
            </>
          )}
        </button>
      </Sider>

      {/* Contenido principal */}
      <Layout style={{ marginLeft: collapsed ? 64 : 240, transition: 'margin-left 0.2s' }}>
        <Content style={{ padding: 28, minHeight: '100vh', background: '#f9fafb' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
