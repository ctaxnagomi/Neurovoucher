import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { VoucherGenerator } from './pages/VoucherGenerator';
import { VoucherList } from './pages/VoucherList';
import { ChatAssistant } from './pages/ChatAssistant';
import { LiveAgent } from './pages/LiveAgent';
import { ReceiptEditor } from './pages/ReceiptEditor';
import { LHDNLetterGenerator } from './pages/LHDNLetterGenerator';
import { NewsUpdates } from './pages/NewsUpdates';
import { TemplateDesigner } from './pages/TemplateDesigner';
import { Settings } from './pages/Settings';
import { LiveAgentProvider } from './contexts/LiveAgentContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Intro } from './pages/Intro';

/* 
  Global Styles Note:
  Styles are imported via index.tsx -> index.css
*/

function App() {
  // Intro screen state
  // In a real app, this might check localStorage to only show once
  const [showIntro, setShowIntro] = useState(true);

  if (showIntro) {
    return <Intro onComplete={() => setShowIntro(false)} />;
  }

  return (
    <LanguageProvider>
      <LiveAgentProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/voucher" element={<VoucherGenerator />} />
              <Route path="/vouchers" element={<VoucherList />} />
              <Route path="/lhdn-letter" element={<LHDNLetterGenerator />} />
              <Route path="/news" element={<NewsUpdates />} />
              <Route path="/design-template" element={<TemplateDesigner />} />
              <Route path="/chat" element={<ChatAssistant />} />
              <Route path="/live" element={<LiveAgent />} />
              <Route path="/editor" element={<ReceiptEditor />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </LiveAgentProvider>
    </LanguageProvider>
  );
}

export default App;