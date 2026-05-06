import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import { ANTD_THEME } from '@/config/antd-theme';
import AppSidebar from '@/components/layout/AppSidebar';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'SEAE — Ingeniería de Negocios 2026',
  description: 'Sistema de Evaluación de Alternativas Económicas — INE135',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AntdRegistry>
          <ConfigProvider theme={ANTD_THEME} locale={esES}>
            <AppSidebar>{children}</AppSidebar>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
