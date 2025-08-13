import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import { HostManager } from '@/components/features/host-manager/HostManager';
import CalendarPage from '@/components/features/calendar/CalendarPage';
import GlobalNav from '@/components/GlobalNav';
import FileTransferPage from '@/components/features/file-transfer/FileTransferPage';
import PivotMasterPage from '@/components/features/pivot/PivotMasterPage';
import LiveReportPage from '@/components/features/reports/LiveReportPage';
import PrivescPage from '@/components/features/privesc/PrivescPage';
import ADMRPage from '@/components/features/admr/ADMRPage';
import GrepMasterPage from '@/components/features/grepmaster/GrepMasterPage';
import ConfigGeneratorPage from '@/components/features/config-generator/ConfigGeneratorPage';
// import TemplateGeneratorPage from '@/components/features/template-generator/TemplateGeneratorPage';
import StandalonePlaygroundPage from '@/components/features/security-lab/HTBLabPage';
// Removed AdKerberosCanvasPage import

const App: React.FC = () => {
  // Thème unique (sombre)

  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/host-manager" element={<HostManager />} />
        <Route path="/config-generator" element={<ConfigGeneratorPage />} />
        {/* <Route path="/template-generator" element={<TemplateGeneratorPage />} /> */}
        <Route path="/standalone-playground" element={<StandalonePlaygroundPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/file-transfer" element={<FileTransferPage />} />
        <Route path="/pivot-master" element={<PivotMasterPage />} />
        <Route path="/grep-master" element={<GrepMasterPage />} />
        <Route path="/report" element={<LiveReportPage />} />
        <Route path="/privesc" element={<PrivescPage />} />
        <Route path="/admr" element={<ADMRPage />} />
        {/* /ad-kerberos route removed */}
        {/* ADMR routes removed */}
        {/* Add more routes as needed */}
      </Routes>
      <GlobalNav />

      {/* Theme toggle retiré */}
    </div>
  );
};

export default App;
