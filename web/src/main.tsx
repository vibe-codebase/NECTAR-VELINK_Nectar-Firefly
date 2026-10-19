import { createRoot } from 'react-dom/client';
import '@fontsource/lora/latin-500.css';
import '@fontsource/lora/latin-500-italic.css';
import '@fontsource/lora/latin-600-italic.css';
import '@fontsource/nunito-sans/latin-400.css';
import '@fontsource/nunito-sans/latin-600.css';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
