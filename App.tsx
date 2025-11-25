import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { VoucherGenerator } from './pages/VoucherGenerator';
import { VoucherList } from './pages/VoucherList';
import { ChatAssistant } from './pages/ChatAssistant';
import { LiveAgent } from './pages/LiveAgent';
import { ReceiptEditor } from './pages/ReceiptEditor';
import { LHDNLetterGenerator } from './pages/LHDNLetterGenerator';
import { Settings } from './pages/Settings';
import { LiveAgentProvider } from './contexts/LiveAgentContext';

function App() {
  return (
    <LiveAgentProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/voucher" element={<VoucherGenerator />} />
            <Route path="/vouchers" element={<VoucherList />} />
            <Route path="/lhdn-letter" element={<LHDNLetterGenerator />} />
            <Route path="/chat" element={<ChatAssistant />} />
            <Route path="/live" element={<LiveAgent />} />
            <Route path="/editor" element={<ReceiptEditor />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </LiveAgentProvider>
  );
}

export default App;