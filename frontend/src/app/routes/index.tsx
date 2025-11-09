import { Routes, Route } from 'react-router-dom';
import { Dashboard } from '../../pages/Dashboard';
import { Tickets} from '../../pages/Tickets';
import { KnowledgeBase } from '../../pages/KnowledgeBase';
import { FAQManager } from '../../pages/FAQManager';
import { Analytics } from '../../pages/Analytics';
import { Settings } from '../../pages/Settings';
import { AILearning } from '../../pages/AILearning';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/tickets" element={<Tickets />} />
      <Route path="/knowledge" element={<KnowledgeBase />} />
      <Route path="/ai-learning" element={<AILearning />} />
      <Route path="/faq-manager" element={<FAQManager />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
};