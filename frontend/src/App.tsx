import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Directly show Dashboard at the root URL */}
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;