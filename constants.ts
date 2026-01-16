import { DropdownOption } from "./types";

export const CATEGORIES: DropdownOption[] = [
  { label: 'Post Instagram (Feed/Stories)', value: 'Instagram Post' },
  { label: 'Criativos (Ads / Anúncios)', value: 'Ad Creative' },
  { label: 'Banner (Site / LinkedIn)', value: 'Web Banner' },
  { label: 'Thumbnail (YouTube)', value: 'YouTube Thumbnail' },
];

export const OBJECTIVES: DropdownOption[] = [
  { label: 'Alto CTR (Cliques)', value: 'High CTR' },
  { label: 'Reconhecimento de Marca', value: 'Brand Awareness' },
  { label: 'Conversão / Vendas', value: 'Conversion' },
  { label: 'Engajamento / Viral', value: 'Engagement' },
];

export const NICHES: DropdownOption[] = [
  { label: 'Vlog / Lifestyle', value: 'Vlog/Lifestyle' },
  { label: 'E-commerce / Produtos', value: 'E-commerce' },
  { label: 'Tecnologia & SaaS', value: 'Technology' },
  { label: 'Saúde & Bem-estar', value: 'Health & Fitness' },
  { label: 'Educação / Infoproduto', value: 'Education' },
  { label: 'Games & Streaming', value: 'Gaming' },
  { label: 'Gastronomia / Delivery', value: 'Gastronomy' },
  { label: 'Imobiliário / Arquitetura', value: 'Real Estate' },
  { label: 'Finanças / Investimentos', value: 'Finance' }
];

export const STYLES: DropdownOption[] = [
  { label: 'Ultra Realista', value: 'Ultra Realistic' },
  { label: 'Cinematográfico', value: 'Cinematic' },
  { label: 'Iluminação de Estúdio', value: 'Studio Lighting' },
  { label: 'Minimalista Clean', value: 'Minimalist' },
  { label: 'Publicidade High-End', value: 'Advertising' },
  { label: 'Vibrante / Neon', value: 'Vibrant Neon' },
  { label: 'Ilustração 3D', value: '3D Illustration' },
  { label: 'Corporativo / Tech', value: 'Corporate Tech' }
];

export const MOODS: DropdownOption[] = [
  { label: 'Neutro / Equilibrado', value: 'Balanced' },
  { label: 'Alegre / Energético', value: 'Happy and Energetic' },
  { label: 'Sério / Profissional', value: 'Professional and Trustworthy' },
  { label: 'Misterioso / Sombrio', value: 'Mysterious and Dark' },
  { label: 'Luxuoso / Elegante', value: 'Luxurious and Elegant' },
  { label: 'Urgente / Impactante', value: 'Urgent and High Impact' },
  { label: 'Calmo / Zen', value: 'Calm and Peaceful' },
  { label: 'Futurista / Inovador', value: 'Futuristic and Innovative' }
];

export const FORMATS: DropdownOption[] = [
  { label: 'Quadrado (1:1)', value: '1:1' },
  { label: 'Vertical (9:16 - Stories/Reels)', value: '9:16' },
  { label: 'Retrato (4:5 - Feed)', value: '4:5' }, 
  { label: 'Paisagem (16:9 - YouTube)', value: '16:9' },
  { label: 'Banner Largo (2:1)', value: '2:1' }
];

export const TEXT_POSITIONS: DropdownOption[] = [
  { label: 'Automático (IA Decide)', value: 'Balanced Composition' },
  { label: 'Topo (Centralizado)', value: 'Top Center (Headline Style)' },
  { label: 'Base (Rodapé)', value: 'Bottom Center (Subtitle Style)' },
  { label: 'Centro (Destaque Total)', value: 'Dead Center (Big Impact)' },
  { label: 'Lateral Esquerda (Espaço Negativo)', value: 'Left Side (Negative Space on Right)' },
  { label: 'Lateral Direita (Espaço Negativo)', value: 'Right Side (Negative Space on Left)' }
];