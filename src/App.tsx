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
import TemplateGeneratorPage from '@/components/features/template-generator/TemplateGeneratorPage';
// Removed AdKerberosCanvasPage import

const App: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/host-manager" element={
          <div className="min-h-screen bg-dark-950 text-dark-100">
            <HostManager />
          </div>
        } />
        <Route path="/config-generator" element={<ConfigGeneratorPage />} />
        <Route path="/template-generator" element={<TemplateGeneratorPage />} />
        <Route path="/calendar" element={
          <div className="min-h-screen bg-dark-950 text-dark-100">
            <CalendarPage />
          </div>
        } />
        <Route path="/file-transfer" element={
          <div className="min-h-screen bg-dark-950 text-dark-100">
            <FileTransferPage />
          </div>
        } />
        <Route path="/pivot-master" element={
          <div className="min-h-screen bg-dark-950 text-dark-100">
            <PivotMasterPage />
          </div>
        } />
        <Route path="/grep-master" element={<GrepMasterPage />} />
        <Route path="/report" element={
          <div className="min-h-screen bg-dark-950 text-dark-100">
            <LiveReportPage />
          </div>
        } />
        <Route path="/privesc" element={
          <div className="min-h-screen bg-dark-950 text-dark-100">
            <PrivescPage />
          </div>
        } />
        <Route path="/admr" element={<ADMRPage />} />
        {/* /ad-kerberos route removed */}
        {/* ADMR routes removed */}
        {/* Add more routes as needed */}
      </Routes>
      <GlobalNav />
    </div>
  );
};

export default App;
